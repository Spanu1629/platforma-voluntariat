import { NotFoundException } from '@nestjs/common';
import { Prisma, type ParticipationJobKind, type ParticipationPlacement, type PlacementState } from '../generated/prisma/client';
import { breakPolicy } from '../planning/planning-store';
import { localDate, shiftTiming, type ScheduledShift } from '../eligibility/eligibility-rules';

export const queueStates: PlacementState[] = ['QUEUED', 'SUSPENDED'];
export const pendingStates: PlacementState[] = ['PROPOSED', ...queueStates, 'OFFERED'];
export const liveStates: PlacementState[] = [...pendingStates, 'CONFIRMED'];

export class ChangedQueue extends Error {}

export function placementView({ id, requestId, positionId, replacesId, state, expiresAt, reviewIssues }: ParticipationPlacement) {
  return { id, requestId, positionId, replacesId, state, expiresAt, reviewIssues };
}

export async function nowInDatabase(tx: Prisma.TransactionClient): Promise<Date> {
  const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
  return now;
}

export async function lockAccounts(tx: Prisma.TransactionClient, ids: string[], organizationId: string) {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Set<string>();
  const accounts = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "IdentityAccount"
    WHERE "organizationId" = ${organizationId} AND id IN (${Prisma.join(unique.map((id) => Prisma.sql`${id}::uuid`))})
    ORDER BY id FOR UPDATE
  `;
  return new Set(accounts.map(({ id }) => id));
}

export async function lockPositions(tx: Prisma.TransactionClient, ids: string[], eventId: string) {
  if (!ids.length) return;
  await tx.$queryRaw`
    SELECT p.id FROM "PlanningPosition" p JOIN "PlanningShift" s ON s.id = p."shiftId"
    WHERE s."eventId" = ${eventId}::uuid AND p.id IN (${Prisma.join([...new Set(ids)].map((id) => Prisma.sql`${id}::uuid`))})
    ORDER BY p.id FOR UPDATE OF p
  `;
}

export async function requireCoordinator(tx: Prisma.TransactionClient, accountId: string, eventId: string) {
  const membership = await tx.planningCoordinator.findFirst({ where: { accountId, eventId, revokedAt: null }, select: { eventId: true } });
  if (!membership) throw new NotFoundException();
}

export async function positionFacts(tx: Prisma.TransactionClient, id: string) {
  const row = await tx.planningPosition.findUnique({ where: { id }, include: { shift: true } });
  if (!row) throw new NotFoundException();
  return row;
}

export async function queuedAccounts(tx: Prisma.TransactionClient, positionIds: string[]) {
  if (!positionIds.length) return [];
  const entries = await tx.participationPlacement.findMany({
    where: { positionId: { in: positionIds }, state: 'QUEUED' },
    select: { request: { select: { accountId: true } } },
  });
  return entries.map(({ request }) => request.accountId);
}

export async function positionCounts(tx: Prisma.TransactionClient, positionId: string, now: Date) {
  const rows = await tx.participationPlacement.groupBy({
    by: ['state'], where: { positionId, OR: [
      { state: { in: ['CONFIRMED', ...queueStates] } },
      { state: 'OFFERED', expiresAt: { gt: now } },
    ] }, _count: { _all: true },
  });
  const count = (state: PlacementState) => rows.find((row) => row.state === state)?._count._all ?? 0;
  return { confirmed: count('CONFIRMED'), activeOffers: count('OFFERED'), waiting: count('QUEUED') + count('SUSPENDED') };
}

export async function scheduleJob(tx: Prisma.TransactionClient, kind: ParticipationJobKind, targetId: string, dueAt: Date) {
  await tx.$executeRaw`
    INSERT INTO "ParticipationJob" (kind, "targetId", "dueAt")
    VALUES (${kind}::"ParticipationJobKind", ${targetId}::uuid, ${dueAt})
    ON CONFLICT (kind, "targetId") DO UPDATE
    SET "dueAt" = LEAST("ParticipationJob"."dueAt", EXCLUDED."dueAt")
  `;
}

export async function enqueue(tx: Prisma.TransactionClient, id: string) {
  const [{ rank }] = await tx.$queryRaw<{ rank: bigint }[]>`SELECT nextval('"ParticipationQueueOrder"') AS rank`;
  return tx.participationPlacement.update({ where: { id }, data: { state: 'QUEUED', queueOrder: rank, reviewIssues: [] } });
}

export async function notice(
  tx: Prisma.TransactionClient, accountId: string, eventId: string, subjectId: string, kind: string,
) {
  await tx.participationNotice.createMany({ data: { accountId, eventId, subjectId, kind } });
}

export async function coordinatorNotices(
  tx: Prisma.TransactionClient, eventId: string, subjectId: string, kind: string,
) {
  const rows = await tx.planningCoordinator.findMany({ where: { eventId, revokedAt: null }, select: { accountId: true } });
  if (rows.length) await tx.participationNotice.createMany({ data: rows.map(({ accountId }) => ({
    accountId, eventId, subjectId, kind,
  })) });
}

export async function participationLinks(tx: Prisma.TransactionClient, accountId: string) {
  // Read the real statuses after the caller has serialized the volunteer and event.
  return tx.$queryRaw<{ eventId: string; kind: string; endsAt: Date | null }[]>`
    SELECT r."eventId", 'REQUEST_OPEN' AS kind, NULL::timestamptz AS "endsAt"
    FROM "ParticipationRequest" r
    WHERE r."accountId" = ${accountId}::uuid AND r."closedAt" IS NULL
      AND EXISTS (SELECT 1 FROM "PlanningShift" s WHERE s."eventId" = r."eventId"
        AND s."canceledAt" IS NULL AND s."endsAt" > statement_timestamp())
    UNION ALL
    SELECT r."eventId", CASE p.state
      WHEN 'PROPOSED' THEN 'PROPOSAL_PENDING' WHEN 'QUEUED' THEN 'QUEUE_WAITING'
      WHEN 'SUSPENDED' THEN 'QUEUE_SUSPENDED' WHEN 'OFFERED' THEN 'OFFER_ACTIVE'
      ELSE 'ASSIGNMENT_CONFIRMED' END,
      CASE p.state WHEN 'OFFERED' THEN p."expiresAt" ELSE s."endsAt" END
    FROM "ParticipationPlacement" p
    JOIN "ParticipationRequest" r ON r.id = p."requestId"
    JOIN "PlanningPosition" pos ON pos.id = p."positionId"
    JOIN "PlanningShift" s ON s.id = pos."shiftId"
    WHERE r."accountId" = ${accountId}::uuid AND s."canceledAt" IS NULL
      AND ((p.state = 'CONFIRMED' AND s."endsAt" > statement_timestamp())
        OR (p.state = 'OFFERED' AND p."expiresAt" > statement_timestamp())
        OR (p.state IN ('PROPOSED', 'QUEUED', 'SUSPENDED') AND s."startsAt" > statement_timestamp()))
  `;
}

export async function scheduleFor(
  tx: Prisma.TransactionClient, accountId: string, organizationId: string, now: Date, excluded: string[],
): Promise<ScheduledShift[]> {
  const rows = await tx.$queryRaw<{
    id: string; replacesId: string | null; state: PlacementState; shiftId: string; startsAt: Date; endsAt: Date;
  }[]>`
    SELECT p.id, p."replacesId", p.state::text, s.id AS "shiftId", s."startsAt", s."endsAt"
    FROM "ParticipationPlacement" p
    JOIN "ParticipationRequest" r ON r.id = p."requestId"
    JOIN "PlanningEvent" e ON e.id = r."eventId"
    JOIN "PlanningPosition" pos ON pos.id = p."positionId"
    JOIN "PlanningShift" s ON s.id = pos."shiftId"
    WHERE r."accountId" = ${accountId}::uuid AND e."organizationId" = ${organizationId}
      AND s."canceledAt" IS NULL AND s."startsAt" IS NOT NULL AND s."endsAt" IS NOT NULL AND
      (p.state = 'CONFIRMED' OR (p.state = 'OFFERED' AND p."expiresAt" > ${now})
       OR (p.state IN ('QUEUED', 'SUSPENDED') AND s."startsAt" > ${now}))
  `;
  const entries = rows.filter(({ id }) => !excluded.includes(id));
  if (!entries.length) return [];
  const policy = await breakPolicy(tx, organizationId);
  const breaks = await tx.planningBreak.findMany({ where: { shiftId: { in: entries.map(({ shiftId }) => shiftId) } } });
  const scheduled = entries.map((entry) => {
    const timing = shiftTiming({ ...entry, breaks: breaks.filter((item) => item.shiftId === entry.shiftId) }, policy);
    return { ...entry, effectiveMinutes: queueStates.includes(entry.state) || !timing.valid ? 0 : timing.effectiveMinutes };
  });

  // Two alternatives of the same move consume at most the larger daily total.
  for (const offer of scheduled) {
    if (offer.state !== 'OFFERED' || !offer.replacesId) continue;
    const source = scheduled.find((entry) => entry.id === offer.replacesId);
    if (source && localDate(source.startsAt) === localDate(offer.startsAt)) {
      offer.effectiveMinutes = Math.max(0, offer.effectiveMinutes - source.effectiveMinutes);
    }
  }
  return scheduled;
}
