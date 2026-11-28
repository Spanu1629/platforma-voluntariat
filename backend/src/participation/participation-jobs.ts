import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import type { EligibilityReview, ParticipationJob, PlacementState, PlanningEvent, Prisma } from '../generated/prisma/client';
import { lockEvent } from '../planning/planning-store';
import { PrismaService } from '../prisma.service';
import { ParticipationService } from './participation.service';
import {
  ChangedQueue, coordinatorNotices, lockAccounts, lockPositions, notice, nowInDatabase,
  pendingStates, positionFacts, queuedAccounts, scheduleJob,
} from './participation-store';

@Injectable()
export class ParticipationJobs implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ParticipationJobs.name);
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;

  constructor(private readonly db: PrismaService, private readonly participation: ParticipationService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      if (!this.running) void this.tick().catch(() => this.logger.error('Participation processing will retry.'));
    }, 1000);
    this.timer.unref();
  }

  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.running?.catch(() => undefined);
  }

  tick(): Promise<void> {
    const next = (this.running ?? Promise.resolve()).catch(() => undefined).then(() => this.drain());
    this.running = next;
    return next.finally(() => { if (this.running === next) this.running = undefined; });
  }

  private async drain() {
    const now = await nowInDatabase(this.db);
    const jobs = await this.db.participationJob.findMany({
      where: { dueAt: { lte: now } }, orderBy: [{ dueAt: 'asc' }, { targetId: 'asc' }], take: 25,
    });
    for (const job of jobs) await this.tryWork(() => this.runJob(job));
    const reviews = await this.db.eligibilityReview.findMany({
      where: { processedAt: null }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 25,
    });
    for (const review of reviews) await this.tryWork(() => this.review(review));
  }

  private async tryWork(work: () => Promise<void>) {
    try {
      await work();
    } catch (error) {
      if (!(error instanceof ChangedQueue)) this.logger.error('Participation work failed and remains pending.');
    }
  }

  private async runJob(job: ParticipationJob) {
    await this.db.$transaction(async (tx) => {
      const position = job.kind === 'POSITION' ? await positionFacts(tx, job.targetId) : null;
      const eventId = position?.shift.eventId ?? job.targetId;
      const { organizationId } = await tx.planningEvent.findUniqueOrThrow({ where: { id: eventId } });
      const accounts = await lockAccounts(tx, position ? await queuedAccounts(tx, [position.id]) : [], organizationId);
      const event = await lockEvent(tx, eventId, organizationId);
      if (position) await lockPositions(tx, [position.id], eventId);
      const now = await nowInDatabase(tx);
      const where = { kind_targetId: { kind: job.kind, targetId: job.targetId } };
      const current = await tx.participationJob.findUnique({ where });
      if (!current || current.dueAt > now) return;

      // The event lock serializes work and enqueueing. A crash rolls back both the effects and this acknowledgement.
      await tx.participationJob.delete({ where });
      if (position) {
        await this.participation.fill(tx, event, position.id, now, accounts);
        const next = await tx.participationPlacement.aggregate({
          where: { positionId: position.id, state: 'OFFERED' }, _min: { expiresAt: true },
        });
        if (next._min.expiresAt) await scheduleJob(tx, 'POSITION', position.id, next._min.expiresAt);
      } else {
        await this.closeElapsed(tx, eventId, now);
      }
    });
  }

  private async closeElapsed(tx: Prisma.TransactionClient, eventId: string, now: Date) {
    const ended = { startsAt: { lte: now }, canceledAt: null };
    const rows = await tx.participationPlacement.findMany({
      where: { request: { eventId }, state: { in: pendingStates }, OR: [
        { position: { shift: ended } }, { replaces: { position: { shift: { endsAt: { lte: now } } } } },
      ] },
      include: { request: true },
    });
    await lockPositions(tx, rows.map(({ positionId }) => positionId), eventId);
    for (const row of rows) await this.participation.updateState(tx, row, 'EXPIRED', row.request, null);

    const last = await this.participation.lastShiftEnd(tx, eventId);
    if (last && last <= now) {
      const active = await tx.participationRequest.findMany({ where: { eventId, closedAt: null } });
      for (const request of active) {
        await tx.participationRequest.update({ where: { id: request.id }, data: { closedAt: now } });
        await notice(tx, request.accountId, eventId, request.id, 'PARTICIPATION_REQUEST_ENDED');
      }
    }
    const upcoming = await tx.planningShift.aggregate({
      where: { eventId, canceledAt: null, startsAt: { gt: now } }, _min: { startsAt: true },
    });
    const next = upcoming._min.startsAt ?? (last && last > now ? last : null);
    if (next) await scheduleJob(tx, 'EVENT', eventId, next);
  }

  private async review(review: EligibilityReview) {
    const state: PlacementState[] = ['CONFIRMED', 'OFFERED', 'QUEUED'];
    const subject = review.reason === 'SHIFT_DATE_CHANGED' ? { position: { shiftId: review.subjectId } }
      : review.reason === 'POSITION_TASKS_CHANGED' || review.reason === 'SUPERVISION_WITHDRAWN' ||
        review.reason === 'POSITION_REQUIREMENTS_RESTORED'
        ? { positionId: review.subjectId }
        : { request: { accountId: review.subjectId } };
    const where = { ...subject, state: { in: state }, position: {
      ...('position' in subject ? subject.position : {}), shift: { canceledAt: null, startsAt: { gt: new Date() } },
    } };
    await this.db.$transaction(async (tx) => {
      const snapshot = await tx.participationPlacement.findMany({ where, include: { request: true } });
      const events = await tx.planningEvent.findMany({
        where: { id: { in: [...new Set(snapshot.map(({ request }) => request.eventId))] } },
        orderBy: { id: 'asc' },
      });
      const accounts = new Set<string>();
      for (const org of [...new Set(events.map(({ organizationId }) => organizationId))].sort()) {
        const ids = new Set(events.filter((event) => event.organizationId === org).map(({ id }) => id));
        const locked = await lockAccounts(tx, snapshot.filter(({ request }) => ids.has(request.eventId))
          .map(({ request }) => request.accountId), org);
        for (const id of locked) accounts.add(id);
      }
      const lockedEvents = new Map<string, PlanningEvent>();
      for (const event of events) lockedEvents.set(event.id, await lockEvent(tx, event.id, event.organizationId));
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "EligibilityReview" WHERE id = ${review.id}::uuid AND "processedAt" IS NULL FOR UPDATE
      `;
      if (!locked.length) return;
      const rows = await tx.participationPlacement.findMany({ where, include: { request: true } });
      if (rows.some(({ request }) => !accounts.has(request.accountId) || !lockedEvents.has(request.eventId))) {
        throw new ChangedQueue();
      }
      for (const event of events) await lockPositions(tx, rows.filter(({ request }) => request.eventId === event.id)
        .map(({ positionId }) => positionId), event.id);
      const now = await nowInDatabase(tx);
      for (const row of rows) {
        const event = lockedEvents.get(row.request.eventId);
        if (!event) throw new ChangedQueue();
        if (row.state === 'OFFERED' && row.expiresAt && row.expiresAt <= now) {
          await scheduleJob(tx, 'POSITION', row.positionId, now);
          continue;
        }
        const issues = await this.participation.issues(tx, row, row.request, event, now);
        if (row.state === 'OFFERED' && this.participation.definitive(issues)) {
          await this.participation.updateState(tx, row, 'CANCELED', row.request, null, issues);
          await scheduleJob(tx, 'POSITION', row.positionId, now);
          continue;
        }
        if (JSON.stringify(issues) !== JSON.stringify(row.reviewIssues)) {
          await tx.participationPlacement.update({ where: { id: row.id }, data: { reviewIssues: issues } });
          await notice(tx, row.request.accountId, event.id, row.id, 'PLACEMENT_ELIGIBILITY_CHANGED');
          await coordinatorNotices(tx, event.id, row.id, 'PLACEMENT_ELIGIBILITY_CHANGED');
        }
        if (row.state === 'QUEUED' && !issues.length) await scheduleJob(tx, 'POSITION', row.positionId, now);
      }
      await tx.eligibilityReview.update({ where: { id: review.id }, data: { processedAt: now } });
    });
  }
}
