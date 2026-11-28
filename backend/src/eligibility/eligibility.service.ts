import { isDeepStrictEqual } from 'node:util';
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, VolunteerAvailability } from '../generated/prisma/client';
import { IdentityService } from '../identity/identity.service';
import { accountActive, lockAccount } from '../identity/identity-store';
import { breakPolicy } from '../planning/planning-store';
import { PrismaService } from '../prisma.service';
import type { Availability } from './eligibility-input';
import {
  ageAtShift, ageIssues, coversShift, localDate, scheduleIssues, shiftTiming, type ScheduledShift,
} from './eligibility-rules';

import { TrainingService } from './training.service';

type ScheduleReader = (
  tx: Prisma.TransactionClient, accountId: string, organizationId: string,
) => Promise<ScheduledShift[]>;

type EligibilityPosition = {
  shiftId: string;
  roleId: string;
  capacity: number;
  startsAt: Date | null;
  endsAt: Date | null;
  publishedAt: Date | null;
  canceledAt: Date | null;
  minimumAge: number;
  supervisionForMinors: boolean;
  specializedTraining: boolean;
  adequate: boolean;
  supervised: boolean;
};

function availabilityView(row: VolunteerAvailability | null): Availability {
  if (!row) return { weekly: [], exceptions: [] };
  // These fields are written only after availabilityInput validates the canonical shape.
  return { weekly: row.weekly as Availability['weekly'], exceptions: row.exceptions as Availability['exceptions'] };
}

@Injectable()
export class EligibilityService {
  constructor(
    private readonly db: PrismaService,
    private readonly identity: IdentityService,
    private readonly training: TrainingService,
  ) {}

  async availability(token: string | undefined, changes?: Availability): Promise<Availability> {
    return this.db.$transaction(async (tx) => {
      const actor = await this.identity.principal(tx, token);
      if (actor.role !== 'VOLUNTEER') throw new ForbiddenException();
      const where = { accountId: actor.id };
      const previous = await tx.volunteerAvailability.findUnique({ where });
      if (!changes || isDeepStrictEqual(changes, availabilityView(previous))) return availabilityView(previous);
      const row = await tx.volunteerAvailability.upsert({ where, create: { ...where, ...changes }, update: changes });
      await tx.eligibilityReview.createMany({ data: { subjectId: actor.id, reason: 'AVAILABILITY_CHANGED' } });
      return availabilityView(row);
    });
  }

  async verifiedIdentity(accountId: string, tx: Pick<Prisma.TransactionClient, 'volunteerIdentityVerification'> = this.db) {
    const result = await tx.volunteerIdentityVerification.findUnique({
      where: { accountId }, select: { result: true, invalidatedAt: true },
    });
    return result?.result === 'VERIFIED' && result.invalidatedAt === null;
  }

  async evaluatePreliminary(tx: Prisma.TransactionClient, accountId: string, positionId: string, schedule: ScheduleReader) {
    return this.evaluate(tx, accountId, positionId, schedule, false);
  }

  // Participation calls this in the same transaction that locks the position and will confirm the assignment.
  async requireForConfirmation(tx: Prisma.TransactionClient, accountId: string, positionId: string, schedule: ScheduleReader) {
    const result = await this.evaluate(tx, accountId, positionId, schedule, true);
    if (result.issues.length) throw new ConflictException({ message: 'Volunteer is not eligible.', issues: result.issues });
    return result;
  }

  private async evaluate(
    tx: Prisma.TransactionClient, accountId: string, positionId: string, schedule: ScheduleReader, requireVerified: boolean,
  ) {
    await lockAccount(tx, accountId);
    const account = await tx.identityAccount.findUnique({
      where: { id: accountId }, include: { profile: { select: { birthDate: true } } },
    });
    if (!account || account.role !== 'VOLUNTEER') throw new NotFoundException();
    const storedAvailability = await tx.volunteerAvailability.findUnique({ where: { accountId } });
    const [position] = await tx.$queryRaw<EligibilityPosition[]>`
      SELECT p."shiftId", p."roleId", p.capacity, s."startsAt", s."endsAt", e."publishedAt", s."canceledAt",
             r."minimumAge", r."supervisionForMinors", r."specializedTraining",
             p."adequacyConfirmedAt" IS NOT NULL AS adequate,
             p."supervisionConfirmedAt" IS NOT NULL AS supervised
      FROM "PlanningPosition" p
      JOIN "PlanningShift" s ON s.id = p."shiftId"
      JOIN "PlanningEvent" e ON e.id = s."eventId"
      JOIN "PlanningRole" r ON r.id = p."roleId"
      WHERE p.id = ${positionId}::uuid AND e."organizationId" = ${account.organizationId}
    `;
    if (!position) throw new NotFoundException();
    const breaks = await tx.planningBreak.findMany({ where: { shiftId: position.shiftId } });
    const { startsAt, endsAt, publishedAt } = position;
    const issues: string[] = [];
    if (!accountActive(account) || !account.approvedAt) issues.push('ACCOUNT_NOT_APPROVED');
    if (requireVerified && !await this.verifiedIdentity(account.id, tx)) issues.push('IDENTITY_VERIFICATION_REQUIRED');
    if (!publishedAt) issues.push('EVENT_NOT_PUBLISHED');
    if (position.canceledAt) issues.push('SHIFT_CANCELED');
    if (position.capacity === 0) issues.push('POSITION_CLOSED');

    if (!startsAt || !endsAt) return { issues: [...issues, 'INVALID_SHIFT'] };
    const shift = { startsAt, endsAt, breaks };
    const timing = shiftTiming(shift, await breakPolicy(tx, account.organizationId));
    if (!timing.valid) return { issues: [...issues, 'INVALID_SHIFT'] };
    const day = localDate(startsAt);
    const weekday = new Date(day + 'T00:00:00Z').getUTCDay() || 7;
    const availability = availabilityView(storedAvailability);
    const weekly = availability.weekly.find((value) => value.weekday === weekday)?.intervals ?? [];
    const exception = availability.exceptions.find((value) => value.date === day)?.intervals;
    if (!coversShift(shift, weekly, exception)) issues.push('AVAILABILITY_REQUIRED');

    if (!account.profile?.birthDate) issues.push('BIRTH_DATE_REQUIRED');
    else {
      const age = ageAtShift(account.profile.birthDate, startsAt);
      issues.push(...ageIssues(age, position));
      issues.push(...scheduleIssues(
        { startsAt, endsAt, effectiveMinutes: timing.effectiveMinutes },
        await schedule(tx, account.id, account.organizationId), age >= 18,
      ));
    }

    const training = await this.training.qualifications(accountId, tx, new Date(day + 'T00:00:00Z'));
    if (!training.general) issues.push('GENERAL_TRAINING_REQUIRED');
    if (position.specializedTraining && !training.roleIds.includes(position.roleId)) {
      issues.push('SPECIALIZED_TRAINING_REQUIRED');
    }
    return { issues, effectiveMinutes: timing.effectiveMinutes };
  }
}
