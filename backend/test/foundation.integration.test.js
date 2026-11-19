const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/generated/prisma/client');
const { seedHistoricalEvent } = require('../dist/historical-seed');

const fixture = {
  event: {
    id: 'synthetic-event',
    name: 'Synthetic test event',
    date: new Date('2026-02-10T00:00:00Z'),
    timeZone: 'Europe/Bucharest',
    volunteerCount: 3,
  },
  roleTotals: [
    { role: 'Synthetic role A', volunteerCount: 1 },
    { role: 'Synthetic role B', volunteerCount: 2 },
  ],
  intervals: [
    { ordinal: 1, startsAt: new Date('2026-02-10T12:00:00Z'), endsAt: new Date('2026-02-10T13:00:00Z') },
    { ordinal: 2, startsAt: new Date('2026-02-10T13:00:00Z'), endsAt: new Date('2026-02-10T14:00:00Z') },
  ],
};

let migrator;
let application;

function readFixture() {
  return application.historicalEvent.findUniqueOrThrow({
    where: { id: fixture.event.id },
    include: {
      roleTotals: { orderBy: { role: 'asc' } },
      intervals: { orderBy: { ordinal: 'asc' } },
    },
  });
}

beforeAll(async () => {
  const { DATABASE_URL, TEST_APP_URL, TEST_BACKEND_URL } = process.env;
  if (!DATABASE_URL || !TEST_APP_URL || !TEST_BACKEND_URL) {
    throw new Error('Run the integration suite with backend/test/run-integration.sh.');
  }

  migrator = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });
  application = new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_APP_URL }) });
  expect(await migrator.historicalEvent.count()).toBe(0);
  await seedHistoricalEvent(migrator, fixture);
}, 15000);

afterAll(async () => {
  await Promise.all([migrator?.$disconnect(), application?.$disconnect()]);
});

test('deploy applies the historical baseline migration', async () => {
  const migrations = await migrator.$queryRaw`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
  `;
  expect(migrations).toEqual([{ migration_name: '20261119000000_historical_baseline' }]);
});

test('the application role reads all three relations and dates round-trip in local time', async () => {
  const [{ current_user }] = await application.$queryRaw`SELECT current_user`;
  expect(current_user).toBe('voluntrack_app');
  const eventId = fixture.event.id;
  expect(await readFixture()).toEqual({
    ...fixture.event,
    roleTotals: fixture.roleTotals.map((row) => ({ ...row, eventId })),
    intervals: fixture.intervals.map((row) => ({ ...row, eventId })),
  });
  const localTimes = await application.$queryRaw`
    SELECT to_char(i."startsAt" AT TIME ZONE e."timeZone", 'HH24:MI') AS start,
           to_char(i."endsAt" AT TIME ZONE e."timeZone", 'HH24:MI') AS finish
    FROM "HistoricalInterval" i JOIN "HistoricalEvent" e ON e.id = i."eventId"
    WHERE e.id = ${eventId}
    ORDER BY i.ordinal
  `;
  expect(localTimes).toEqual([
    { start: '14:00', finish: '15:00' },
    { start: '15:00', finish: '16:00' },
  ]);
});

test('repeating the seed leaves all rows and their keys unchanged', async () => {
  const before = await readFixture();
  await seedHistoricalEvent(migrator, fixture);
  expect(await readFixture()).toEqual(before);
  expect(await application.historicalEvent.count()).toBe(1);
  expect(await application.historicalRoleTotal.count()).toBe(fixture.roleTotals.length);
  expect(await application.historicalInterval.count()).toBe(fixture.intervals.length);
});

test('an invalid interval rolls back prior event and role writes', async () => {
  const before = await readFixture();
  const invalid = {
    event: { ...fixture.event, volunteerCount: 99 },
    roleTotals: [{ ...fixture.roleTotals[0], volunteerCount: 99 }],
    intervals: [{ ...fixture.intervals[0], endsAt: fixture.intervals[0].startsAt }],
  };
  await expect(seedHistoricalEvent(migrator, invalid)).rejects.toThrow(/check constraint/i);
  expect(await readFixture()).toEqual(before);
});

test('effective privileges remain limited across the historical tables and shadow database', async () => {
  for (const table of ['"HistoricalEvent"', '"HistoricalRoleTotal"', '"HistoricalInterval"']) {
    const [privileges] = await application.$queryRaw`
      SELECT has_table_privilege(current_user, ${table}, 'SELECT') AS can_read,
             has_table_privilege(current_user, ${table}, 'INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') AS can_modify,
             has_schema_privilege(current_user, 'public', 'CREATE') AS can_create,
             has_database_privilege(current_user, current_database(), 'TEMP') AS can_create_temp,
             has_database_privilege(current_user, 'voluntrack_shadow', 'CONNECT') AS can_connect_shadow
    `;
    expect(privileges).toEqual({
      can_read: true,
      can_modify: false,
      can_create: false,
      can_create_temp: false,
      can_connect_shadow: false,
    });
  }
});

test.each([
  ['INSERT', () => application.$executeRaw`INSERT INTO "HistoricalEvent" VALUES ('denied', 'denied', CURRENT_DATE, 'UTC', 0)`],
  ['UPDATE', () => application.$executeRaw`UPDATE "HistoricalEvent" SET "volunteerCount" = 0`],
  ['DELETE', () => application.$executeRaw`DELETE FROM "HistoricalEvent"`],
  ['DDL', () => application.$executeRaw`CREATE TABLE denied_table (id integer)`],
])('PostgreSQL rejects %s as the application role', async (_operation, execute) => {
  await expect(execute()).rejects.toThrow(/permission denied/i);
});

test('the final backend image serves the readiness contract', async () => {
  const response = await fetch(new URL('/health/ready', process.env.TEST_BACKEND_URL), {
    signal: AbortSignal.timeout(4000),
  });
  expect(response.status).toBe(200);
});
