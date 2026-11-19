import { Prisma, PrismaClient } from './generated/prisma/client';

interface HistoricalSeed {
  event: Prisma.HistoricalEventCreateManyInput;
  roleTotals: Omit<Prisma.HistoricalRoleTotalCreateManyInput, 'eventId'>[];
  intervals: Omit<Prisma.HistoricalIntervalCreateManyInput, 'eventId'>[];
}

export async function seedHistoricalEvent(
  prisma: PrismaClient,
  { event, roleTotals, intervals }: HistoricalSeed,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const { id: eventId, ...eventData } = event;
    await tx.historicalEvent.upsert({
      where: { id: eventId },
      create: event,
      update: eventData,
    });

    for (const { role, volunteerCount } of roleTotals) {
      await tx.historicalRoleTotal.upsert({
        where: { eventId_role: { eventId, role } },
        create: { eventId, role, volunteerCount },
        update: { volunteerCount },
      });
    }

    for (const { ordinal, startsAt, endsAt } of intervals) {
      await tx.historicalInterval.upsert({
        where: { eventId_ordinal: { eventId, ordinal } },
        create: { eventId, ordinal, startsAt, endsAt },
        update: { startsAt, endsAt },
      });
    }
  });
}
