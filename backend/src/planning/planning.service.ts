import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma, type IdentityAccount, type PlanningEvent, type PlanningPosition, type PlanningShift } from '../generated/prisma/client';
import { ORGANIZATION } from '../identity/identity-input';
import { IdentityService } from '../identity/identity.service';
import { lockAccountInRole } from '../identity/identity-store';
import { PrismaService } from '../prisma.service';
import { localDate, shiftTiming, type Span } from '../eligibility/eligibility-rules';
import { auditPlanning, breakPolicy, lockEvent } from './planning-store';
import type { eventInput, locationInput, positionInput, shiftInput } from './planning-input';

const publicEvent = {
  id: true, title: true, description: true,
  shifts: {
    orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true, startsAt: true, endsAt: true,
      location: { select: { id: true, name: true, address: true } },
      positions: {
        where: { capacity: { gt: 0 } }, orderBy: { roleId: 'asc' },
        select: { role: { select: { id: true, name: true } } },
      },
    },
  },
} satisfies Prisma.PlanningEventSelect;

function publicView(event: Prisma.PlanningEventGetPayload<{ select: typeof publicEvent }>) {
  return { ...event, shifts: event.shifts.map(({ positions, ...shift }) => ({
    ...shift, roles: positions.map(({ role }) => role),
  })) };
}

function positionView(row: PlanningPosition) {
  return {
    id: row.id, roleId: row.roleId, capacity: row.capacity, tasks: row.tasks,
    adequacy: row.adequacyConfirmedAt && { actorId: row.adequacyConfirmedBy, confirmedAt: row.adequacyConfirmedAt },
    supervision: row.supervisionConfirmedAt && { actorId: row.supervisionConfirmedBy, confirmedAt: row.supervisionConfirmedAt },
  };
}

function shiftView(shift: PlanningShift, breaks: Span[]) {
  return { ...shift, breaks: breaks.map(({ startsAt, endsAt }) => ({ startsAt, endsAt })) };
}

function groupByShift<Row extends { shiftId: string }>(rows: Row[]): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const group = grouped.get(row.shiftId);
    if (group) group.push(row);
    else grouped.set(row.shiftId, [row]);
  }
  return grouped;
}

function sameInstant(left: Date | null, right: Date | null): boolean {
  return left === null || right === null ? left === right : +left === +right;
}

function hasParticipation(activity: { confirmed: number; activeOffers: number; waiting: number }): boolean {
  return activity.confirmed > 0 || activity.activeOffers > 0 || activity.waiting > 0;
}

// Installed with participation and queried under the same event lock as the edit.
export const PLANNING_PARTICIPATION = Symbol('PLANNING_PARTICIPATION');
export interface PlanningParticipation {
  counts(tx: Prisma.TransactionClient, positionId: string): Promise<{ confirmed: number; activeOffers: number; waiting: number }>;
  capacityChanged(tx: Prisma.TransactionClient, positionId: string, previous: number, current: number): Promise<void>;
}

@Injectable()
export class PlanningService {
  constructor(
    private readonly db: PrismaService,
    private readonly identity: IdentityService,
    @Optional() @Inject(PLANNING_PARTICIPATION) private readonly participation?: PlanningParticipation,
  ) {}

  async published(eventId?: string) {
    const where = { organizationId: ORGANIZATION, publishedAt: { not: null } };
    if (eventId) {
      const row = await this.db.planningEvent.findFirst({ where: { ...where, id: eventId }, select: publicEvent });
      if (!row) throw new NotFoundException();
      return publicView(row);
    }
    const rows = await this.db.planningEvent.findMany({
      where, select: publicEvent, orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map(publicView);
  }

  async staffEvents(token: string | undefined) {
    return this.db.$transaction(async (tx) => {
      const actor = await this.identity.principal(tx, token);
      this.requireStaff(actor);
      return tx.planningEvent.findMany({
        where: {
          organizationId: actor.organizationId,
          ...(actor.role === 'COORDINATOR' ? { coordinators: { some: { accountId: actor.id, revokedAt: null } } } : {}),
        },
        select: { id: true, title: true, description: true, publishedAt: true }, orderBy: { id: 'asc' },
      });
    });
  }

  async staffEvent(token: string | undefined, eventId: string) {
    return this.withEvent(token, eventId, async (tx, _actor, event) => {
      const locations = await tx.planningLocation.findMany({ where: { eventId }, orderBy: { name: 'asc' } });
      const coordinators = await tx.planningCoordinator.findMany({
        where: { eventId }, select: { accountId: true, revokedAt: true }, orderBy: { accountId: 'asc' },
      });
      const shifts = await tx.planningShift.findMany({
        where: { eventId }, orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      });
      if (!shifts.length) return { ...event, locations, coordinators, shifts: [] };

      const where = { shiftId: { in: shifts.map(({ id }) => id) } };
      const breaks = groupByShift(await tx.planningBreak.findMany({ where, orderBy: { startsAt: 'asc' } }));
      const positions = groupByShift(await tx.planningPosition.findMany({ where, orderBy: { roleId: 'asc' } }));
      return { ...event, locations, coordinators, shifts: shifts.map((shift) => ({
        ...shiftView(shift, breaks.get(shift.id) ?? []),
        positions: (positions.get(shift.id) ?? []).map(positionView),
      })) };
    });
  }

  async roles(token: string | undefined) {
    return this.db.$transaction(async (tx) => {
      const actor = await this.identity.principal(tx, token);
      this.requireStaff(actor);
      return tx.planningRole.findMany({ where: { organizationId: actor.organizationId }, orderBy: { id: 'asc' } });
    });
  }

  async createEvent(token: string | undefined, data: ReturnType<typeof eventInput>) {
    return this.db.$transaction(async (tx) => {
      const actor = await this.identity.principal(tx, token);
      this.requireStaff(actor);
      const event = await tx.planningEvent.create({ data: { ...data, organizationId: actor.organizationId } });
      if (actor.role === 'COORDINATOR') {
        await tx.planningCoordinator.create({ data: { eventId: event.id, accountId: actor.id } });
        await auditPlanning(tx, event.id, actor.id, actor.id, 'COORDINATOR_ASSIGNED');
      }
      await auditPlanning(tx, event.id, actor.id, event.id, 'EVENT_CREATED');
      return event;
    });
  }

  async editEvent(token: string | undefined, eventId: string, data: ReturnType<typeof eventInput>) {
    return this.withEvent(token, eventId, async (tx, actor, event) => {
      const updated = await tx.planningEvent.update({ where: { id: eventId }, data });
      if (event.publishedAt) await this.requirePublishable(tx, updated);
      if (updated.title !== event.title || updated.description !== event.description) {
        await auditPlanning(tx, eventId, actor.id, eventId, 'EVENT_EDITED');
      }
      return updated;
    });
  }

  async publish(token: string | undefined, eventId: string): Promise<void> {
    await this.withEvent(token, eventId, async (tx, actor, event) => {
      await this.requirePublishable(tx, event);
      if (event.publishedAt) return;
      await tx.planningEvent.update({ where: { id: eventId }, data: { publishedAt: new Date() } });
      await auditPlanning(tx, eventId, actor.id, eventId, 'EVENT_PUBLISHED');
    });
  }

  async assign(token: string | undefined, eventId: string, accountId: string, granted: boolean): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const actor = await this.identity.principal(tx, token);
      this.requireStaff(actor);
      if (actor.role !== 'ADMIN') {
        await this.authorizeEvent(tx, eventId, actor);
        throw new ForbiddenException();
      }

      // Planning requests lock the actor's account before taking an event lock.
      const isCoordinator = await lockAccountInRole(tx, accountId, actor.organizationId, 'COORDINATOR');
      await lockEvent(tx, eventId, actor.organizationId);
      const where = { eventId_accountId: { eventId, accountId } };
      const assignment = await tx.planningCoordinator.findUnique({ where });
      if (!isCoordinator && (granted || !assignment)) throw new NotFoundException();
      if (granted && assignment?.revokedAt !== null) {
        await tx.planningCoordinator.upsert({
          where, create: { eventId, accountId }, update: { revokedAt: null },
        });
        await auditPlanning(tx, eventId, actor.id, accountId, 'COORDINATOR_ASSIGNED');
      } else if (!granted && assignment?.revokedAt === null) {
        await tx.planningCoordinator.update({ where, data: { revokedAt: new Date() } });
        await auditPlanning(tx, eventId, actor.id, accountId, 'COORDINATOR_REVOKED');
      }
    });
  }

  async saveLocation(token: string | undefined, eventId: string, data: ReturnType<typeof locationInput>, id?: string) {
    return this.withEvent(token, eventId, async (tx, actor) => {
      let location;
      if (id) {
        const current = await tx.planningLocation.findFirst({ where: { id, eventId } });
        if (!current) throw new NotFoundException();
        if (this.participation && data.address !== undefined && current.address !== data.address) {
          const positions = await tx.planningPosition.findMany({
            where: { shift: { eventId, locationId: id } }, select: { id: true },
          });
          for (const position of positions) {
            if (hasParticipation(await this.participation.counts(tx, position.id))) {
              throw new ConflictException('Cancel and recreate shifts using the changed location.');
            }
          }
        }
        location = await tx.planningLocation.update({ where: { id }, data });
      } else {
        location = await tx.planningLocation.create({ data: { ...data, eventId } });
      }
      await auditPlanning(tx, eventId, actor.id, location.id, id ? 'LOCATION_EDITED' : 'LOCATION_ADDED');
      return location;
    });
  }

  async saveShift(token: string | undefined, eventId: string, data: ReturnType<typeof shiftInput>, id?: string) {
    return this.withEvent(token, eventId, async (tx, actor, event) => {
      const { breaks, positions, ...values } = data;
      if (positions && await tx.planningRole.count({
        where: { organizationId: event.organizationId, id: { in: positions.map(({ roleId }) => roleId) } },
      }) !== positions.length) throw new NotFoundException();
      if (values.locationId && !await tx.planningLocation.findFirst({ where: { eventId, id: values.locationId } })) {
        throw new NotFoundException();
      }
      const previous = id && await tx.planningShift.findFirst({ where: { id, eventId } });
      if (id && !previous) throw new NotFoundException();
      const startsAt = values.startsAt === undefined ? (previous ? previous.startsAt : null) : values.startsAt;
      const endsAt = values.endsAt === undefined ? (previous ? previous.endsAt : null) : values.endsAt;
      const plannedBreaks = breaks ?? (previous
        ? await tx.planningBreak.findMany({ where: { shiftId: previous.id } })
        : []);
      if (startsAt && endsAt && !shiftTiming({ startsAt, endsAt, breaks: plannedBreaks }, await breakPolicy(tx, event.organizationId)).valid) {
        throw new ConflictException('Invalid shift timing or planned break.');
      }
      const dateChanged = previous && previous.startsAt && startsAt && localDate(previous.startsAt) !== localDate(startsAt);
      if (previous && this.participation && (
        !sameInstant(previous.startsAt, startsAt) || !sameInstant(previous.endsAt, endsAt) ||
        (values.locationId !== undefined && values.locationId !== previous.locationId) || breaks !== undefined
      )) {
        const existingPositions = await tx.planningPosition.findMany({
          where: { shiftId: previous.id }, select: { id: true },
        });
        for (const position of existingPositions) {
          const counts = await this.participation.counts(tx, position.id);
          if (hasParticipation(counts)) throw new ConflictException('Cancel and recreate the shift.');
        }
      }
      const shift = previous
        ? await tx.planningShift.update({ where: { id: previous.id }, data: values })
        : await tx.planningShift.create({ data: { ...values, eventId } });
      if (breaks !== undefined) {
        await tx.planningBreak.deleteMany({ where: { shiftId: shift.id } });
        await tx.planningBreak.createMany({ data: breaks.map((pause) => ({ ...pause, shiftId: shift.id })) });
      }
      if (positions?.length) {
        await tx.planningPosition.createMany({ data: positions.map((position) => ({ ...position, shiftId: shift.id })) });
      }
      if (event.publishedAt) await this.requirePublishable(tx, event);
      if (dateChanged) {
        await tx.eligibilityReview.createMany({ data: { subjectId: shift.id, reason: 'SHIFT_DATE_CHANGED' } });
      }
      await auditPlanning(tx, eventId, actor.id, shift.id, previous ? 'SHIFT_EDITED' : 'SHIFT_ADDED');
      return shiftView(shift, plannedBreaks);
    });
  }

  async savePosition(
    token: string | undefined, eventId: string, shiftId: string, roleId: string, data: ReturnType<typeof positionInput>,
  ) {
    return this.withEvent(token, eventId, async (tx, actor, event) => {
      if (!await tx.planningShift.findFirst({ where: { id: shiftId, eventId } }) ||
        !await tx.planningRole.findFirst({ where: { id: roleId, organizationId: event.organizationId } })) {
        throw new NotFoundException();
      }
      const where = { shiftId_roleId: { shiftId, roleId } };
      const previous = await tx.planningPosition.findUnique({ where });
      if (!previous && data.capacity === undefined) throw new BadRequestException('Capacity is required.');
      if (previous && data.capacity !== undefined && data.capacity < previous.capacity && this.participation) {
        const counts = await this.participation.counts(tx, previous.id);
        if (data.capacity < counts.confirmed + counts.activeOffers) {
          throw new ConflictException('Capacity cannot be lower than reserved places.');
        }
      }
      const tasksChanged = previous && data.tasks !== undefined && data.tasks !== previous.tasks;
      const position = previous
        ? await tx.planningPosition.update({
          where, data: { ...data, ...(tasksChanged ? { adequacyConfirmedAt: null, adequacyConfirmedBy: null } : {}) },
        })
        : await tx.planningPosition.create({ data: { shiftId, roleId, capacity: data.capacity!, tasks: data.tasks } });
      if (event.publishedAt) await this.requirePublishable(tx, event);
      if (tasksChanged) {
        await tx.eligibilityReview.createMany({ data: { subjectId: position.id, reason: 'POSITION_TASKS_CHANGED' } });
      }
      if (previous && previous.capacity !== position.capacity) {
        const action = position.capacity === 0 ? 'POSITION_CLOSED' : previous.capacity === 0 ? 'POSITION_REOPENED' : 'POSITION_CAPACITY_CHANGED';
        await this.participation?.capacityChanged(tx, position.id, previous.capacity, position.capacity);
        await auditPlanning(tx, eventId, actor.id, position.id, action);
      }
      if (!previous || tasksChanged) {
        await auditPlanning(tx, eventId, actor.id, position.id, previous ? 'POSITION_TASKS_EDITED' : 'POSITION_ADDED');
      }
      return positionView(position);
    });
  }

  async confirmPosition(
    token: string | undefined, eventId: string, shiftId: string, roleId: string,
    confirmation: 'adequacy' | 'supervision', confirmed: boolean,
  ) {
    return this.withEvent(token, eventId, async (tx, actor) => {
      if (actor.role !== 'COORDINATOR') throw new ForbiddenException();
      const previous = await tx.planningPosition.findFirst({ where: { shiftId, roleId, shift: { eventId } } });
      if (!previous) throw new NotFoundException();
      const existing = confirmation === 'adequacy' ? previous.adequacyConfirmedAt : previous.supervisionConfirmedAt;
      if (Boolean(existing) === confirmed) return positionView(previous);
      const now = confirmed ? new Date() : null;
      const by = confirmed ? actor.id : null;
      const data = confirmation === 'adequacy'
        ? { adequacyConfirmedAt: now, adequacyConfirmedBy: by }
        : { supervisionConfirmedAt: now, supervisionConfirmedBy: by };
      const row = await tx.planningPosition.update({ where: { id: previous.id }, data });
      const action = confirmation === 'adequacy'
        ? (confirmed ? 'POSITION_ADEQUACY_CONFIRMED' : 'POSITION_ADEQUACY_WITHDRAWN')
        : (confirmed ? 'POSITION_SUPERVISION_CONFIRMED' : 'POSITION_SUPERVISION_WITHDRAWN');
      await auditPlanning(tx, eventId, actor.id, row.id, action);
      if (!confirmed) {
        await tx.eligibilityReview.createMany({ data: {
          subjectId: row.id, reason: confirmation === 'adequacy' ? 'POSITION_TASKS_CHANGED' : 'SUPERVISION_WITHDRAWN',
        } });
      }
      return positionView(row);
    });
  }

  private requireStaff(actor: IdentityAccount): void {
    if (actor.role === 'VOLUNTEER') throw new ForbiddenException();
  }

  private async withEvent<T>(
    token: string | undefined, id: string,
    operate: (tx: Prisma.TransactionClient, actor: IdentityAccount, event: PlanningEvent) => Promise<T>,
  ): Promise<T> {
    return this.db.$transaction(async (tx) => {
      const actor = await this.identity.principal(tx, token);
      this.requireStaff(actor);
      const event = await this.authorizeEvent(tx, id, actor);
      return operate(tx, actor, event);
    });
  }

  private async authorizeEvent(tx: Prisma.TransactionClient, id: string, actor: IdentityAccount): Promise<PlanningEvent> {
    const event = await lockEvent(tx, id, actor.organizationId);
    if (actor.role === 'COORDINATOR' && !await tx.planningCoordinator.findFirst({
      where: { eventId: id, accountId: actor.id, revokedAt: null }, select: { eventId: true },
    })) throw new NotFoundException();
    return event;
  }

  private async requirePublishable(tx: Prisma.TransactionClient, event: PlanningEvent): Promise<void> {
    if (!event.title?.trim() || !event.description?.trim()) {
      throw new ConflictException('A title and description are required.');
    }
    const shifts = await tx.planningShift.findMany({ where: { eventId: event.id } });
    if (!shifts.length) throw new ConflictException('At least one shift is required.');

    const where = { shiftId: { in: shifts.map(({ id }) => id) } };
    const breaksByShift = groupByShift(await tx.planningBreak.findMany({ where }));
    const openPositions = await tx.planningPosition.findMany({
      where: { ...where, capacity: { gt: 0 } }, select: { shiftId: true },
    });
    const openShifts = new Set(openPositions.map(({ shiftId }) => shiftId));
    const policy = await breakPolicy(tx, event.organizationId);
    for (const { id, startsAt, endsAt, locationId } of shifts) {
      const breaks = breaksByShift.get(id) ?? [];
      if (!startsAt || !endsAt || !locationId || !openShifts.has(id) || !shiftTiming({ startsAt, endsAt, breaks }, policy).valid) {
        throw new ConflictException('Each shift needs valid timing, a location and a position with positive capacity.');
      }
    }
  }
}
