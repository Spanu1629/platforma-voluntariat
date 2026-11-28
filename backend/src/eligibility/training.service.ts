import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type TrainingAction, type TrainingType } from '../generated/prisma/client';
import { uuid } from '../identity/identity-input';
import { IdentityService } from '../identity/identity.service';
import { audit, lockAccountInRole } from '../identity/identity-store';
import { text } from '../planning/planning-input';
import { PrismaService } from '../prisma.service';
import { localDate } from './eligibility-rules';

const openLinks = new Set(['REQUEST_OPEN', 'PROPOSAL_PENDING', 'QUEUE_WAITING', 'QUEUE_SUSPENDED']);
type ParticipationLink = { eventId: string; kind: string; endsAt: Date | null };
type ParticipationReader = (tx: Prisma.TransactionClient, accountId: string) => Promise<ParticipationLink[]>;
type CompletedTraining = {
  type: TrainingType; domain: string; trainer: string; completedOn: Date; roleIds: string[]; renewsRecordId?: string;
};

export function activeParticipationLink(link: Pick<ParticipationLink, 'kind' | 'endsAt'>, now: Date): boolean {
  if (link.kind === 'OFFER_ACTIVE' || link.kind === 'ASSIGNMENT_CONFIRMED') return link.endsAt !== null && link.endsAt > now;
  return openLinks.has(link.kind);
}

@Injectable()
export class TrainingService {
  constructor(private readonly db: PrismaService, private readonly identity: IdentityService) {}

  async setPermission(token: string | undefined, id: string, granted: boolean): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const actor = await this.identity.principal(tx, token);
      if (actor.role !== 'ADMIN') throw new ForbiddenException();
      if (!await lockAccountInRole(tx, id, actor.organizationId, 'COORDINATOR')) throw new NotFoundException();
      const result = granted
        ? await tx.trainingPermission.createMany({ data: { accountId: id }, skipDuplicates: true })
        : await tx.trainingPermission.deleteMany({ where: { accountId: id } });
      if (result.count) await audit(tx, actor.id, id, granted ? 'TRAINING_PERMISSION_GRANTED' : 'TRAINING_PERMISSION_REVOKED', new Date());
    });
  }

  async confirm(token: string | undefined, id: string, completed: CompletedTraining, readLinks: ParticipationReader) {
    return this.withAccess(token, id, readLinks, async (tx, { actorId, eventId, organizationId, now }) => {
      const { type, completedOn, roleIds, renewsRecordId } = completed;
      if ((type !== 'GENERAL' && type !== 'SPECIALIZED') || !Number.isFinite(+completedOn) ||
        completedOn.toISOString().slice(0, 10) > localDate(now) ||
        (type === 'SPECIALIZED' && !roleIds.length) || new Set(roleIds).size !== roleIds.length ||
        (renewsRecordId !== undefined && !uuid(renewsRecordId))) {
        throw new BadRequestException('Invalid training record.');
      }
      if (await tx.planningRole.count({ where: { id: { in: roleIds }, organizationId } }) !== roleIds.length) {
        throw new BadRequestException('Invalid training roles.');
      }
      const previous = renewsRecordId && await this.record(tx, id, renewsRecordId);
      if (previous && (previous.canceledAt || previous.supersededById || !previous.renewalRequestedAt ||
        previous.type !== type || previous.completedOn > completedOn)) {
        throw new ConflictException('This training cannot be renewed with this record.');
      }

      const record = await tx.trainingRecord.create({ data: {
        accountId: id, type, domain: text(completed.domain, 250), trainer: text(completed.trainer, 200), completedOn,
        confirmedBy: actorId, confirmedAt: now, roles: { createMany: { data: roleIds.map((roleId) => ({ roleId })) } },
      } });
      if (previous) {
        await tx.trainingRecord.update({ where: { id: previous.id }, data: { supersededById: record.id } });
      }
      await this.history(tx, record.id, eventId, actorId, now, 'CONFIRMED');
      return record;
    });
  }

  async requestRenewal(token: string | undefined, id: string, trainingId: string, readLinks: ParticipationReader): Promise<void> {
    await this.withAccess(token, id, readLinks, async (tx, { actorId, eventId, now }) => {
      const row = await this.record(tx, id, trainingId);
      if (row.canceledAt || row.supersededById) throw new ConflictException('This training is no longer active.');
      if (row.renewalRequestedAt) return;
      await tx.trainingRecord.update({ where: { id: trainingId }, data: { renewalRequestedAt: now } });
      await this.history(tx, trainingId, eventId, actorId, now, 'RENEWAL_REQUESTED');
    });
  }

  async cancel(token: string | undefined, id: string, trainingId: string, reason: string, readLinks: ParticipationReader): Promise<void> {
    await this.withAccess(token, id, readLinks, async (tx, { actorId, eventId, now }) => {
      const explanation = text(reason, 1000);
      const row = await this.record(tx, id, trainingId);
      if (row.canceledAt) return;
      await tx.trainingRecord.update({ where: { id: trainingId }, data: { canceledAt: now } });
      await this.history(tx, trainingId, eventId, actorId, now, 'CANCELED', explanation);
      await tx.eligibilityReview.createMany({ data: { subjectId: id, reason: 'TRAINING_CANCELED' } });
    });
  }

  async qualifications(
    accountId: string, tx: Pick<Prisma.TransactionClient, 'trainingRecord'> = this.db, completedBy?: Date,
  ) {
    const records = await tx.trainingRecord.findMany({
      where: { accountId, canceledAt: null, supersededById: null, completedOn: completedBy && { lte: completedBy } },
      select: { type: true, roles: { select: { roleId: true } } },
    });
    const roleIds = new Set(records.flatMap(({ type, roles }) =>
      type === 'SPECIALIZED' ? roles.map(({ roleId }) => roleId) : []));
    return { general: records.some(({ type }) => type === 'GENERAL'), roleIds: [...roleIds].sort() };
  }

  private async record(tx: Prisma.TransactionClient, accountId: string, id: string) {
    if (!uuid(id)) throw new NotFoundException();
    const row = await tx.trainingRecord.findFirst({ where: { id, accountId } });
    if (!row) throw new NotFoundException();
    return row;
  }

  private async history(
    tx: Prisma.TransactionClient, recordId: string, eventId: string, actorId: string, occurredAt: Date,
    action: TrainingAction, reason: string | null = null,
  ) {
    await tx.trainingOperation.createMany({ data: { recordId, eventId, actorId, occurredAt, action, reason } });
  }

  private async withAccess<T>(
    token: string | undefined, id: string, readLinks: ParticipationReader,
    operation: (tx: Prisma.TransactionClient, access: {
      actorId: string; eventId: string; organizationId: string; now: Date;
    }) => Promise<T>,
  ): Promise<T> {
    return this.db.$transaction(async (tx) => {
      const actor = await this.identity.principal(tx, token);
      if (actor.role !== 'COORDINATOR' ||
        !await tx.trainingPermission.findUnique({ where: { accountId: actor.id } })) throw new ForbiddenException();
      if (!await lockAccountInRole(tx, id, actor.organizationId, 'VOLUNTEER')) throw new NotFoundException();
      const links = await readLinks(tx, id);
      const now = new Date();
      const eventIds = [...new Set(links.filter((link) => activeParticipationLink(link, now)).map((link) => link.eventId))];
      if (!eventIds.length) throw new ForbiddenException();
      const [assignment] = await tx.$queryRaw<{ eventId: string }[]>`
        SELECT pc."eventId" FROM "PlanningCoordinator" pc
        JOIN "PlanningEvent" event ON event.id = pc."eventId"
        WHERE pc."eventId" IN (${Prisma.join(eventIds.map((eventId) => Prisma.sql`${eventId}::uuid`))})
          AND event."organizationId" = ${actor.organizationId}
          AND pc."accountId" = ${actor.id}::uuid
          AND pc."revokedAt" IS NULL
        ORDER BY pc."eventId" LIMIT 1 FOR SHARE OF pc
      `;
      if (!assignment) throw new ForbiddenException();
      return operation(tx, { actorId: actor.id, eventId: assignment.eventId, organizationId: actor.organizationId, now });
    });
  }
}
