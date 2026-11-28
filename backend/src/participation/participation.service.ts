import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { IdentityAccount, ParticipationPlacement, ParticipationRequest, PlanningEvent, Prisma } from '../generated/prisma/client';
import { ageAtShift, scheduleIssues, shiftTiming } from '../eligibility/eligibility-rules';
import { EligibilityService } from '../eligibility/eligibility.service';
import { accountActive } from '../identity/identity-store';
import { IdentityService } from '../identity/identity.service';
import { auditPlanning, breakPolicy, lockEvent } from '../planning/planning-store';
import { PrismaService } from '../prisma.service';
import {
  ChangedQueue, coordinatorNotices, enqueue, liveStates, lockAccounts, lockPositions, notice,
  nowInDatabase, pendingStates, placementView, positionCounts, positionFacts, queuedAccounts,
  requireCoordinator, scheduleFor, scheduleJob,
} from './participation-store';

type Scope = { eventId: string; positions?: string[]; accounts?: string[]; priority?: string[] };
type Selection = (tx: Prisma.TransactionClient, actor: IdentityAccount) => Promise<Scope>;
type Locked = {
  tx: Prisma.TransactionClient;
  actor: IdentityAccount;
  event: PlanningEvent;
  now: Date;
  accounts: Set<string>;
};
const minute = 60_000;

@Injectable()
export class ParticipationService {
  constructor(private readonly db: PrismaService, private readonly identity: IdentityService,
              private readonly eligibility: EligibilityService) {}

  async open(token: string | undefined, eventId: string) {
    return this.scoped(token, async () => ({ eventId }), async ({ tx, actor, event, now }) => {
      if (actor.role !== 'VOLUNTEER' || !actor.approvedAt) throw new ForbiddenException();
      if (!event.publishedAt) throw new NotFoundException();
      const last = await this.lastShiftEnd(tx, event.id);
      if (!last || last <= now) throw new ConflictException('The event has ended.');
      const existing = await tx.participationRequest.findFirst({
        where: { accountId: actor.id, eventId, closedAt: null },
      });
      if (existing) return existing;
      const request = await tx.participationRequest.create({ data: { accountId: actor.id, eventId } });
      await auditPlanning(tx, eventId, actor.id, request.id, 'PARTICIPATION_REQUEST_OPENED');
      await coordinatorNotices(tx, eventId, request.id, 'PARTICIPATION_REQUEST_OPENED');
      await scheduleJob(tx, 'EVENT', eventId, last);
      return request;
    });
  }

  async propose(token: string | undefined, requestId: string, positionId: string, replacesId?: string) {
    return this.scoped(token, async (tx, actor) => {
      const request = await this.request(tx, requestId);
      await this.coordinator(tx, actor, request.eventId);
      return { eventId: request.eventId, accounts: [request.accountId], positions: [positionId] };
    }, async ({ tx, actor, event, now }) => {
      await this.coordinator(tx, actor, event.id);
      const request = await this.request(tx, requestId);
      if (request.closedAt || !event.publishedAt) throw new ConflictException('The request is closed.');
      const position = await this.openPosition(tx, positionId, event.id, now);
      const existing = await tx.participationPlacement.findFirst({
        where: { requestId, positionId, state: { in: liveStates } },
      });
      if (existing) {
        if (existing.state === 'PROPOSED' && existing.replacesId === (replacesId ?? null)) return placementView(existing);
        throw new ConflictException('A placement already exists for this position.');
      }
      if (replacesId) {
        const source = await this.placement(tx, replacesId);
        if (source.request.accountId !== request.accountId || source.request.eventId !== event.id ||
            source.state !== 'CONFIRMED' || source.positionId === positionId) {
          throw new ConflictException('The source placement cannot be replaced.');
        }
        const sourceShift = (await positionFacts(tx, source.positionId)).shift;
        if (!sourceShift.endsAt || sourceShift.endsAt <= now || sourceShift.canceledAt) {
          throw new ConflictException('The source placement has ended.');
        }
        if (await tx.participationPlacement.count({ where: { replacesId, state: { in: pendingStates } } })) {
          throw new ConflictException('A move is already pending.');
        }
      }
      const result = await this.eligibility.evaluatePreliminary(tx, request.accountId, positionId,
        (client) => scheduleFor(client, request.accountId, event.organizationId, now, replacesId ? [replacesId] : []));
      if (result.issues.length) this.ineligible(result.issues);
      const row = await tx.participationPlacement.create({ data: { requestId, positionId, proposedBy: actor.id, replacesId } });
      await this.record(tx, row, request.accountId, event.id, actor.id, 'PLACEMENT_PROPOSED');
      await scheduleJob(tx, 'EVENT', event.id, position.shift.startsAt);
      return placementView(row);
    });
  }

  async respond(token: string | undefined, id: string, accept: boolean) {
    const outcome = await this.scoped(token, (tx, actor) => this.placementScope(tx, id, actor, accept), async ({ tx, actor, event, now, accounts }) => {
      const row = await this.ownPlacement(tx, id, actor);
      if ((accept && ['QUEUED', 'SUSPENDED', 'CONFIRMED'].includes(row.state)) || (!accept && row.state === 'DECLINED')) return row;
      if (row.request.closedAt || !['PROPOSED', 'OFFERED'].includes(row.state)) {
        throw new ConflictException('This placement is no longer awaiting a response.');
      }
      const position = await positionFacts(tx, row.positionId);
      const expired = !position.shift.startsAt || position.shift.startsAt <= now ||
        (row.state === 'OFFERED' && (!row.expiresAt || row.expiresAt <= now));
      if (expired) {
        await this.updateState(tx, row, 'EXPIRED', row.request, actor.id);
        await scheduleJob(tx, 'POSITION', row.positionId, now);
        return { issues: ['PLACEMENT_EXPIRED'] };
      }
      if (!accept) {
        const declined = await this.updateState(tx, row, 'DECLINED', row.request, actor.id);
        if (row.state === 'OFFERED') await scheduleJob(tx, 'POSITION', row.positionId, now);
        return declined;
      }
      await this.openPosition(tx, row.positionId, event.id, now);
      const issues = await this.issues(tx, row, row.request, event, now);
      if (issues.length) {
        if (row.state === 'OFFERED' && this.definitive(issues)) {
          await this.updateState(tx, row, 'CANCELED', row.request, actor.id, issues);
          await scheduleJob(tx, 'POSITION', row.positionId, now);
        }
        return { issues };
      }
      if (row.state === 'PROPOSED') await this.fill(tx, event, row.positionId, now, accounts);
      const { confirmed, activeOffers } = await positionCounts(tx, row.positionId, now);
      if (confirmed + activeOffers - Number(row.state === 'OFFERED') >= position.capacity) {
        if (row.state === 'OFFERED') throw new ConflictException('The offered seat is no longer available.');
        const queued = await enqueue(tx, id);
        await this.record(tx, queued, actor.id, event.id, actor.id, 'PLACEMENT_QUEUED');
        return queued;
      }
      if (row.replacesId) {
        const source = await this.placement(tx, row.replacesId);
        if (source.state !== 'CONFIRMED') throw new ConflictException('The source placement is no longer confirmed.');
        await this.updateState(tx, source, 'REPLACED', source.request, actor.id);
        await scheduleJob(tx, 'POSITION', source.positionId, now);
      }
      return this.updateState(tx, row, 'CONFIRMED', row.request, actor.id);
    });
    if ('issues' in outcome) this.ineligible(outcome.issues);
    return placementView(outcome);
  }

  async rejoin(token: string | undefined, id: string) {
    return this.scoped(token, (tx, actor) => this.placementScope(tx, id, actor, false), async ({ tx, actor, event, now }) => {
      const row = await this.ownPlacement(tx, id, actor);
      if (row.request.closedAt || row.queueOrder === null || !['DECLINED', 'EXPIRED'].includes(row.state)) {
        throw new ConflictException('This queue entry cannot be reopened.');
      }
      await this.openPosition(tx, row.positionId, event.id, now);
      const issues = await this.issues(tx, row, row.request, event, now);
      if (issues.length) this.ineligible(issues);
      if (await tx.participationPlacement.count({ where: {
        requestId: row.requestId, state: { in: liveStates },
        OR: [{ positionId: row.positionId }, ...(row.replacesId ? [{ replacesId: row.replacesId }] : [])],
      } })) throw new ConflictException('A live placement already exists.');
      const next = await tx.participationPlacement.create({ data: {
        requestId: row.requestId, positionId: row.positionId, proposedBy: row.proposedBy, replacesId: row.replacesId,
      } });
      const queued = await enqueue(tx, next.id);
      await this.record(tx, queued, actor.id, event.id, actor.id, 'PLACEMENT_REJOINED');
      await scheduleJob(tx, 'POSITION', row.positionId, now);
      return placementView(queued);
    });
  }

  async withdrawRequest(token: string | undefined, id: string) {
    await this.scoped(token, async (tx, actor) => {
      const request = await this.request(tx, id);
      if (request.accountId !== actor.id || actor.role !== 'VOLUNTEER') throw new NotFoundException();
      return { eventId: request.eventId };
    }, async ({ tx, actor, event, now }) => {
        const request = await this.request(tx, id);
        if (request.accountId !== actor.id || actor.role !== 'VOLUNTEER') throw new NotFoundException();
        if (request.closedAt) return;
        const pending = await tx.participationPlacement.findMany({ where: { requestId: id, state: { in: pendingStates } } });
        await lockPositions(tx, pending.map(({ positionId }) => positionId), event.id);
        for (const row of pending) {
          await this.updateState(tx, row, 'WITHDRAWN', request, actor.id);
          if (row.state === 'OFFERED') await scheduleJob(tx, 'POSITION', row.positionId, now);
        }
        await tx.participationRequest.update({ where: { id }, data: { closedAt: now } });
        await auditPlanning(tx, event.id, actor.id, id, 'PARTICIPATION_REQUEST_WITHDRAWN');
        await coordinatorNotices(tx, event.id, id, 'PARTICIPATION_REQUEST_WITHDRAWN');
      });
  }

  async withdrawPlacement(token: string | undefined, id: string, reason?: string) {
    await this.scoped(token, (tx, actor) => this.placementScope(tx, id, actor, false, true), async ({ tx, actor, event, now }) => {
      const row = await this.placement(tx, id);
      const own = actor.role === 'VOLUNTEER' && row.request.accountId === actor.id;
      if (!own) {
        await this.coordinator(tx, actor, event.id);
        if (!reason) throw new ConflictException('A reason is required.');
      }
      if (row.state === 'WITHDRAWN') return;
      if (!liveStates.includes(row.state)) throw new ConflictException('This placement is no longer active.');
      const { shift } = await positionFacts(tx, row.positionId);
      if (!shift.startsAt || (own && row.state === 'CONFIRMED' && now.getTime() > shift.startsAt.getTime() - 60 * minute) ||
        (!own && (!shift.endsAt || shift.endsAt <= now))) {
        throw new ConflictException('The withdrawal deadline has passed.');
      }
      await this.updateState(tx, row, 'WITHDRAWN', row.request, actor.id, undefined, own ? undefined : reason);
      if (row.state === 'CONFIRMED' || row.state === 'OFFERED') await scheduleJob(tx, 'POSITION', row.positionId, now);
      await this.closeReplacements(tx, row, now, actor.id);
    });
  }

  async cancelShift(token: string | undefined, eventId: string, shiftId: string, reason: string) {
    await this.scoped(token, async () => ({ eventId }), async ({ tx, actor, event, now }) => {
      await this.coordinator(tx, actor, eventId);
      const shift = await tx.planningShift.findFirst({ where: { id: shiftId, eventId } });
      if (!shift) throw new NotFoundException();
      if (shift.canceledAt) return;
      if (shift.startsAt && shift.startsAt <= now) throw new ConflictException('The shift has already started.');
      const positions = await tx.planningPosition.findMany({ where: { shiftId }, select: { id: true } });
      await lockPositions(tx, positions.map(({ id }) => id), eventId);
      const rows = await tx.participationPlacement.findMany({
        where: { positionId: { in: positions.map(({ id }) => id) }, state: { in: liveStates } }, include: { request: true },
      });
      for (const row of rows) {
        await this.updateState(tx, row, 'CANCELED', row.request, actor.id, [], reason);
        if (row.state === 'CONFIRMED') await this.closeReplacements(tx, row, now, actor.id);
      }
      await tx.planningShift.update({ where: { id: shiftId }, data: { canceledAt: now } });
      await tx.planningAudit.createMany({ data: {
        eventId, actorId: actor.id, targetId: shiftId, action: 'SHIFT_CANCELED', reason,
      } });
      const remaining = await tx.planningShift.count({ where: { eventId, canceledAt: null } });
      if (!remaining && event.publishedAt) {
        await tx.planningEvent.update({ where: { id: eventId }, data: { publishedAt: null } });
      }
      await scheduleJob(tx, 'EVENT', eventId, now);
    });
  }

  async mine(token: string | undefined) {
    return this.db.$transaction(async (tx) => {
      const actor = await this.identity.principal(tx, token);
      if (actor.role !== 'VOLUNTEER') throw new ForbiddenException();
      return this.readRequests(tx, { accountId: actor.id });
    });
  }

  async staff(token: string | undefined, eventId: string) {
    return this.scoped(token, async () => ({ eventId }), async ({ tx, actor }) => {
      await this.coordinator(tx, actor, eventId);
      return this.readRequests(tx, { eventId });
    });
  }

  async notifications(token: string | undefined) {
    return this.db.$transaction(async (tx) => {
      const actor = await this.identity.principal(tx, token);
      const scope = actor.role === 'COORDINATOR'
        ? (await tx.planningCoordinator.findMany({
            where: { accountId: actor.id, revokedAt: null, event: { organizationId: actor.organizationId } },
            select: { eventId: true },
          })).map(({ eventId }) => eventId)
        : undefined;
      const where = { accountId: actor.id, ...(scope ? { eventId: { in: scope } } : {}) };
      const rows = await tx.participationNotice.findMany({ where, orderBy: { id: 'desc' }, take: 100 });
      return rows.map((row) => ({ id: row.id.toString(), eventId: row.eventId, subjectId: row.subjectId, kind: row.kind }));
    });
  }

  async fill(tx: Prisma.TransactionClient, event: PlanningEvent, positionId: string, now: Date, accounts: Set<string>) {
    const position = await positionFacts(tx, positionId);
    const expired = await tx.participationPlacement.findMany({
      where: { positionId, state: 'OFFERED', expiresAt: { lte: now } }, include: { request: true },
    });
    for (const row of expired) await this.updateState(tx, row, 'EXPIRED', row.request, null);
    if (!event.publishedAt || !position.capacity || position.shift.canceledAt ||
      !position.shift.startsAt || position.shift.startsAt <= now) return;
    const counts = await positionCounts(tx, positionId, now);
    let free = position.capacity - counts.confirmed - counts.activeOffers;
    if (free <= 0) return;
    const entries = await tx.participationPlacement.findMany({
      where: { positionId, state: 'QUEUED', request: { closedAt: null } },
      orderBy: { queueOrder: 'asc' }, include: { request: true },
    });
    if (entries.some(({ request }) => !accounts.has(request.accountId))) throw new ChangedQueue();
    const { offerDurationMinutes } = await breakPolicy(tx, event.organizationId);
    for (const row of entries) {
      const issues = await this.issues(tx, row, row.request, event, now);
      if (issues.length) {
        if (JSON.stringify(issues) !== JSON.stringify(row.reviewIssues)) {
          await tx.participationPlacement.update({ where: { id: row.id }, data: { reviewIssues: issues } });
          await this.record(tx, row, row.request.accountId, event.id, null, 'QUEUE_CANDIDATE_SKIPPED');
        }
        continue;
      }
      const source = row.replacesId ? await this.placement(tx, row.replacesId) : undefined;
      const sourceEnd = source ? (await positionFacts(tx, source.positionId)).shift.endsAt : null;
      const expiresAt = new Date(Math.min(+position.shift.startsAt, +now + offerDurationMinutes * minute,
        sourceEnd ? +sourceEnd : Infinity));
      const offered = await tx.participationPlacement.update({
        where: { id: row.id }, data: { state: 'OFFERED', expiresAt, reviewIssues: [] },
      });
      await this.record(tx, offered, row.request.accountId, event.id, null, 'PLACEMENT_OFFERED');
      await scheduleJob(tx, 'POSITION', positionId, expiresAt);
      if (--free === 0) break;
    }
  }

  async issues(tx: Prisma.TransactionClient, row: ParticipationPlacement, request: ParticipationRequest,
               event: PlanningEvent, now: Date) {
    const excluded = [row.id];
    if (row.replacesId) {
      const source = await this.placement(tx, row.replacesId);
      if (source.state !== 'CONFIRMED' || source.request.accountId !== request.accountId || source.request.eventId !== event.id) {
        return ['SOURCE_PLACEMENT_CLOSED'];
      }
      const shift = (await positionFacts(tx, source.positionId)).shift;
      if (!shift.startsAt || !shift.endsAt || shift.endsAt <= now || shift.canceledAt) return ['SOURCE_PLACEMENT_CLOSED'];
      const breaks = await tx.planningBreak.findMany({ where: { shiftId: shift.id } });
      const timing = shiftTiming({ startsAt: shift.startsAt, endsAt: shift.endsAt, breaks }, await breakPolicy(tx, event.organizationId));
      const profile = await tx.identityProfile.findUnique({ where: { accountId: request.accountId }, select: { birthDate: true } });
      if (!timing.valid || !profile?.birthDate) return ['CURRENT_SCHEDULE_INVALID'];
      const others = await scheduleFor(tx, request.accountId, event.organizationId, now, [row.id, source.id]);
      const current = scheduleIssues({ startsAt: shift.startsAt, endsAt: shift.endsAt, effectiveMinutes: timing.effectiveMinutes },
        others, ageAtShift(profile.birthDate, shift.startsAt) >= 18);
      if (current.length) return current;
      excluded.push(source.id);
    }
    try {
      await this.eligibility.requireForConfirmation(tx, request.accountId, row.positionId,
        (client) => scheduleFor(client, request.accountId, event.organizationId, now, excluded));
      return [];
    } catch (error) {
      if (!(error instanceof ConflictException)) throw error;
      const response = error.getResponse();
      if (typeof response === 'object' && 'issues' in response && Array.isArray(response.issues)) return response.issues as string[];
      throw error;
    }
  }

  definitive(issues: string[]) {
    return issues.includes('SOURCE_PLACEMENT_CLOSED') ||
      (issues.includes('AGE_BELOW_MINIMUM') && !issues.includes('IDENTITY_VERIFICATION_REQUIRED'));
  }

  async updateState(tx: Prisma.TransactionClient, row: ParticipationPlacement, state: ParticipationPlacement['state'],
                    request: ParticipationRequest, actorId: string | null, reviewIssues: string[] = [], reason?: string) {
    const updated = await tx.participationPlacement.update({ where: { id: row.id }, data: { state, reviewIssues } });
    await this.record(tx, updated, request.accountId, request.eventId, actorId, 'PLACEMENT_' + state, reason);
    return updated;
  }

  async lastShiftEnd(tx: Prisma.TransactionClient, eventId: string) {
    const result = await tx.planningShift.aggregate({ where: { eventId, canceledAt: null }, _max: { endsAt: true } });
    return result._max.endsAt;
  }

  private async scoped<T>(token: string | undefined, lookup: Selection, apply: (context: Locked) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.db.$transaction(async (tx) => {
          const id = await this.identity.sessionAccountId(tx, token);
          const hint = await tx.identityAccount.findUnique({ where: { id } });
          if (!hint || !accountActive(hint)) throw new UnauthorizedException();
          const scope = await lookup(tx, hint);
          const visible = await tx.planningEvent.findFirst({
            where: { id: scope.eventId, organizationId: hint.organizationId }, select: { id: true },
          });
          if (!visible) throw new NotFoundException();
          const candidates = await queuedAccounts(tx, scope.priority ?? []);
          const accounts = await lockAccounts(tx, [id, ...(scope.accounts ?? []), ...candidates], hint.organizationId);
          const actor = await this.identity.principal(tx, token);
          if (actor.id !== id || actor.organizationId !== hint.organizationId) throw new UnauthorizedException();
          const event = await lockEvent(tx, scope.eventId, actor.organizationId);
          await lockPositions(tx, scope.positions ?? [], event.id);
          return apply({ tx, actor, event, accounts, now: await nowInDatabase(tx) });
        });
      } catch (error) {
        if (!(error instanceof ChangedQueue)) throw error;
        if (attempt >= 3) throw new ConflictException('The queue changed. Retry the request.');
      }
    }
  }

  private async request(tx: Prisma.TransactionClient, id: string) {
    const request = await tx.participationRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException();
    return request;
  }

  private async placement(tx: Prisma.TransactionClient, id: string) {
    const row = await tx.participationPlacement.findUnique({ where: { id }, include: { request: true } });
    if (!row) throw new NotFoundException();
    return row;
  }

  private async ownPlacement(tx: Prisma.TransactionClient, id: string, actor: IdentityAccount) {
    const row = await this.placement(tx, id);
    if (actor.role !== 'VOLUNTEER' || row.request.accountId !== actor.id) throw new NotFoundException();
    return row;
  }

  private async placementScope(
    tx: Prisma.TransactionClient, id: string, actor: IdentityAccount, priority: boolean, coordinator = false,
  ): Promise<Scope> {
    const row = await this.placement(tx, id);
    if (row.request.accountId !== actor.id || actor.role !== 'VOLUNTEER') {
      if (!coordinator) throw new NotFoundException();
      await this.coordinator(tx, actor, row.request.eventId);
    }
    const source = row.replacesId && await this.placement(tx, row.replacesId);
    return {
      eventId: row.request.eventId, accounts: [row.request.accountId],
      positions: source ? [row.positionId, source.positionId] : [row.positionId],
      priority: priority ? [row.positionId] : [],
    };
  }

  private async coordinator(tx: Prisma.TransactionClient, actor: IdentityAccount, eventId: string) {
    if (actor.role !== 'COORDINATOR') throw new ForbiddenException();
    await requireCoordinator(tx, actor.id, eventId);
  }

  private async openPosition(tx: Prisma.TransactionClient, id: string, eventId: string, now: Date) {
    const row = await positionFacts(tx, id);
    if (row.shift.eventId !== eventId) throw new NotFoundException();
    if (!row.capacity || row.shift.canceledAt || !row.shift.startsAt || row.shift.startsAt <= now) {
      throw new ConflictException('The position is closed.');
    }
    return { ...row, shift: { ...row.shift, startsAt: row.shift.startsAt } };
  }

  private async readRequests(tx: Prisma.TransactionClient, where: Prisma.ParticipationRequestWhereInput) {
    const rows = await tx.participationRequest.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] });
    const placements = await tx.participationPlacement.findMany({
      where: { requestId: { in: rows.map(({ id }) => id) } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({ ...row, placements: placements.filter((item) => item.requestId === row.id).map(placementView) }));
  }

  private async closeReplacements(tx: Prisma.TransactionClient, source: ParticipationPlacement, now: Date, actorId: string) {
    const pending = await tx.participationPlacement.findMany({
      where: { replacesId: source.id, state: { in: pendingStates } }, include: { request: true },
    });
    for (const row of pending) {
      await this.updateState(tx, row, 'CANCELED', row.request, actorId, ['SOURCE_PLACEMENT_CLOSED']);
      if (row.state === 'OFFERED') await scheduleJob(tx, 'POSITION', row.positionId, now);
    }
  }

  private async record(tx: Prisma.TransactionClient, row: ParticipationPlacement, accountId: string, eventId: string,
                       actorId: string | null, action: string, reason?: string) {
    await tx.planningAudit.createMany({ data: { eventId, actorId, targetId: row.id, action, reason } });
    await notice(tx, accountId, eventId, row.id, action);
    await coordinatorNotices(tx, eventId, row.id, action);
  }

  private ineligible(issues: string[]): never {
    throw new ConflictException({ message: 'Volunteer is not eligible.', issues });
  }
}
