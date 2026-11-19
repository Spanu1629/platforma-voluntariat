import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from './generated/prisma/client';
import { seedHistoricalEvent } from './historical-seed';

// EVENT.md and Q-009. The four times use Bucharest's UTC+02:00 offset on this date.
const event = {
  id: 'trenuletul-mosului-2025',
  name: 'Trenulețul Moșului',
  date: new Date('2025-12-20T00:00:00Z'),
  timeZone: 'Europe/Bucharest',
  volunteerCount: 24,
};

const roleTotals = [
  { role: 'Coordonare generală și logistică', volunteerCount: 2 },
  { role: 'Primirea participanților și verificarea biletelor', volunteerCount: 4 },
  { role: 'Coordonarea accesului la trenuleț', volunteerCount: 4 },
  { role: 'Ateliere și activități creative', volunteerCount: 4 },
  { role: 'Sprijin pentru programul artistic și animatori', volunteerCount: 3 },
  { role: 'Informare și promovare caritabilă', volunteerCount: 2 },
  { role: 'Distribuire materiale și cadouri', volunteerCount: 3 },
  { role: 'Amenajare, ordine și suport logistic', volunteerCount: 2 },
];

const intervals = [
  { ordinal: 1, startsAt: new Date('2025-12-20T13:00:00+02:00'), endsAt: new Date('2025-12-20T16:00:00+02:00') },
  { ordinal: 2, startsAt: new Date('2025-12-20T16:00:00+02:00'), endsAt: new Date('2025-12-20T18:00:00+02:00') },
  { ordinal: 3, startsAt: new Date('2025-12-20T18:00:00+02:00'), endsAt: new Date('2025-12-20T20:00:00+02:00') },
  { ordinal: 4, startsAt: new Date('2025-12-20T20:00:00+02:00'), endsAt: new Date('2025-12-20T21:00:00+02:00') },
];

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required for the historical seed.');
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    await seedHistoricalEvent(prisma, { event, roleTotals, intervals });
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  const code = error instanceof Prisma.PrismaClientKnownRequestError ? ` (${error.code})` : '';
  console.error(`Historical seed failed${code}.`);
  process.exitCode = 1;
});
