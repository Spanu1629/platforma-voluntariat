const { integration } = require('./eligibility-fixtures');

jest.setTimeout(30000);
const testDb = integration();
const staffEvents = '/planning/events';
const publishedEvents = '/events';
const role = 'creative-workshops';
const otherRole = 'materials-distribution';
const stamp = (time) => `2027-02-14T${time}:00+02:00`;

const write = (actor, path, method, body, status) => testDb.json(path, { actor, method, body }, status);
const status = async (actor, path, method, body, expected, csrf) => {
  expect((await testDb.request(path, { actor, method, body, csrf })).status).toBe(expected);
};

async function draft(actor, values = {}) {
  const row = await write(actor, staffEvents, 'POST', values, 201);
  return `${staffEvents}/${row.id}`;
}

async function fullDraft(actor, title = 'Eveniment sintetic') {
  const path = await draft(actor, { title, description: 'Descriere sintetică' });
  const location = await write(actor, `${path}/locations`, 'POST', { name: 'Loc sintetic' }, 201);
  const shift = await write(actor, `${path}/shifts`, 'POST', {
    locationId: location.id, startsAt: stamp('10:00'), endsAt: stamp('15:00'),
    breaks: [{ startsAt: stamp('12:00'), endsAt: stamp('12:30') }],
  }, 201);
  const shiftPath = `${path}/shifts/${shift.id}`;
  const position = `${shiftPath}/positions/${role}`;
  await write(actor, position, 'PUT', { capacity: 2, tasks: 'Sarcini sintetice' });
  return { path, shiftPath, position, id: path.split('/').at(-1), location };
}

test('only active staff with CSRF can create drafts and the creator is assigned atomically', async () => {
  const coordinator = await testDb.account('COORDINATOR');
  const volunteer = await testDb.account('VOLUNTEER');
  await status(null, staffEvents, 'POST', {}, 401);
  await status(volunteer, staffEvents, 'POST', {}, 403);
  await status(coordinator, staffEvents, 'POST', {}, 403, false);
  const path = await draft(coordinator);
  const eventId = path.split('/').at(-1);
  const assigned = await testDb.db.planningCoordinator.findUnique({
    where: { eventId_accountId: { eventId, accountId: coordinator.id } },
  });
  expect(assigned).toMatchObject({ revokedAt: null });
  await status(coordinator, path, 'GET', undefined, 200);
});

test('only administrators manage assignments and revocation removes access without erasing history', async () => {
  const admin = await testDb.account('ADMIN');
  const creator = await testDb.account('COORDINATOR');
  const coordinator = await testDb.account('COORDINATOR');
  const outsider = await testDb.account('ADMIN', { organizationId: 'synthetic-outsider' });
  const path = await draft(creator);
  const coordinatorPath = `${path}/coordinators/${coordinator.id}`;
  await status(creator, coordinatorPath, 'PUT', {}, 403);
  await status(outsider, coordinatorPath, 'PUT', {}, 404);
  await status(admin, coordinatorPath, 'PUT', {}, 204);
  await status(coordinator, path, 'PATCH', { title: 'Titlu de test' }, 200);
  await status(admin, coordinatorPath, 'DELETE', undefined, 204);
  await status(coordinator, path, 'PATCH', { title: 'Schimbare fără acces' }, 404);
  const rows = await testDb.db.planningAudit.findMany({
    where: { eventId: path.split('/').at(-1), targetId: coordinator.id },
    orderBy: { occurredAt: 'asc' },
  });
  expect(rows.map((row) => row.action)).toEqual(['COORDINATOR_ASSIGNED', 'COORDINATOR_REVOKED']);
});

test('publication validates all shifts, drafts stay private, and public output uses a restricted projection', async () => {
  const admin = await testDb.account('ADMIN');
  const pending = await testDb.account('VOLUNTEER');
  const { path, id, shiftPath } = await fullDraft(admin);
  await status(null, `${publishedEvents}/${id}`, 'GET', undefined, 404);
  await status(admin, path, 'PATCH', { description: null }, 200);
  await status(admin, `${path}/publish`, 'POST', {}, 409);
  await status(admin, path, 'PATCH', { description: 'Descriere sintetică' }, 200);
  await status(admin, shiftPath, 'PATCH', { locationId: null }, 200);
  await status(admin, `${path}/publish`, 'POST', {}, 409);
  const other = await draft(admin);
  const foreign = await write(admin, `${other}/locations`, 'POST', { name: 'Alt loc' }, 201);
  await status(admin, shiftPath, 'PATCH', { locationId: foreign.id }, 404);
  const location = await write(admin, `${path}/locations`, 'POST', { name: 'Loc public' }, 201);
  await status(admin, shiftPath, 'PATCH', { locationId: location.id }, 200);
  await status(admin, `${path}/publish`, 'POST', {}, 204);
  const publicEvent = await testDb.json(`${publishedEvents}/${id}`);
  expect(publicEvent).toEqual({
    id, title: 'Eveniment sintetic', description: 'Descriere sintetică',
    shifts: [expect.objectContaining({
      location: expect.objectContaining({ name: 'Loc public' }),
      roles: [{ id: role, name: 'Ateliere și activități creative' }],
    })],
  });
  expect(Object.keys(publicEvent.shifts[0]).sort()).toEqual(['endsAt', 'id', 'location', 'roles', 'startsAt']);
  expect(await testDb.json(`${publishedEvents}/${id}`, { actor: pending })).toEqual(publicEvent);
  expect(await testDb.json(publishedEvents)).toEqual(expect.arrayContaining([expect.objectContaining({ id })]));
});

test('a position may close or reopen while publication retains a positive position', async () => {
  const coordinator = await testDb.account('COORDINATOR');
  const { path, id, shiftPath, position } = await fullDraft(coordinator);
  await status(coordinator, `${path}/publish`, 'POST', {}, 204);
  await status(coordinator, position, 'PUT', { capacity: 0 }, 409);
  const second = `${shiftPath}/positions/${otherRole}`;
  await write(coordinator, second, 'PUT', { capacity: 1 });
  const closed = await write(coordinator, position, 'PUT', { capacity: 0 });
  expect(closed.capacity).toBe(0);
  expect((await testDb.json(`${publishedEvents}/${id}`)).shifts[0].roles.map((value) => value.id))
    .toEqual([otherRole]);
  const reopened = await write(coordinator, position, 'PUT', { capacity: 1 });
  expect(reopened.id).toBe(closed.id);
  expect((await testDb.json(`${publishedEvents}/${id}`)).shifts[0].roles.map((value) => value.id))
    .toEqual(expect.arrayContaining([role, otherRole]));
  expect(await testDb.db.planningPosition.count({ where: { id: closed.id } })).toBe(1);
});

test('concurrent publication and edits preserve availability of at least one positive position', async () => {
  const admin = await testDb.account('ADMIN');
  const { path, id, position } = await fullDraft(admin);
  const [publish, close] = await Promise.all([
    testDb.request(`${path}/publish`, { actor: admin, method: 'POST', body: {} }),
    testDb.request(position, { actor: admin, method: 'PUT', body: { capacity: 0 } }),
  ]);
  expect([[204, 409], [409, 200]]).toContainEqual([publish.status, close.status]);
  if (publish.status === 204) {
    expect((await testDb.json(`${publishedEvents}/${id}`)).shifts[0].roles).toHaveLength(1);
  }
});

test('adecvarea și supravegherea sunt distincte și modificarea sarcinilor invalidează adecvarea', async () => {
  const admin = await testDb.account('ADMIN');
  const coordinator = await testDb.account('COORDINATOR');
  const { position } = await fullDraft(coordinator);
  await status(admin, `${position}/adequacy`, 'PUT', { confirmed: true }, 403);
  const adequate = await write(coordinator, `${position}/adequacy`, 'PUT', { confirmed: true });
  expect(adequate.adequacy).toEqual({ actorId: coordinator.id, confirmedAt: expect.any(String) });
  expect(adequate.supervision).toBeNull();
  await write(coordinator, `${position}/supervision`, 'PUT', { confirmed: true });
  const edited = await write(coordinator, position, 'PUT', { tasks: 'Sarcini noi' });
  expect(edited.adequacy).toBeNull();
  expect(edited.supervision).toEqual({ actorId: coordinator.id, confirmedAt: expect.any(String) });
  await write(coordinator, `${position}/supervision`, 'PUT', { confirmed: false });
  expect(await testDb.db.eligibilityReview.count({ where: { subjectId: edited.id } })).toBe(2);
});

test('OpenAPI documents public and authenticated planning operations', async () => {
  const { paths } = await testDb.json('/openapi.json');
  expect(paths['/events'].get.security).toBeUndefined();
  expect(paths['/planning/events'].post.security).toEqual([{ session: [] }]);
  expect(paths['/planning/events'].post.parameters).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: 'X-CSRF-Token', required: true }),
  ]));
  expect(paths['/planning/events/{eventId}'].get.responses['200'].content['application/json'].schema.required)
    .toContain('shifts');
  expect(paths['/eligibility/availability'].put.responses['200'].content['application/json'].schema.required)
    .toEqual(['weekly', 'exceptions']);
});

test('a coordinator can add a fully configured shift to an already published event atomically', async () => {
  const coordinator = await testDb.account('COORDINATOR');
  const { id, path, location } = await fullDraft(coordinator);
  await status(coordinator, `${path}/publish`, 'POST', {}, 204);
  await write(coordinator, `${path}/shifts`, 'POST', {
    locationId: location.id, startsAt: stamp('16:00'), endsAt: stamp('18:00'),
    positions: [{ roleId: otherRole, capacity: 2 }],
  }, 201);
  const result = await testDb.json(`${publishedEvents}/${id}`);
  expect(result.shifts).toHaveLength(2);
  expect(result.shifts[1].roles).toEqual([{ id: otherRole, name: 'Distribuire materiale și cadouri' }]);
});

test('event assignment can be prepared before a coordinator activates an account', async () => {
  const admin = await testDb.account('ADMIN');
  const coordinator = await testDb.account('COORDINATOR', { activatedAt: null, emailVerifiedAt: null });
  const path = await draft(admin);
  await status(admin, `${path}/coordinators/${coordinator.id}`, 'PUT', {}, 204);
  await status(coordinator, path, 'GET', undefined, 401);
  await testDb.db.identityAccount.update({
    where: { id: coordinator.id }, data: { activatedAt: new Date(), emailVerifiedAt: new Date() },
  });
  await status(coordinator, path, 'GET', undefined, 200);
});

test('reservation counts supplied in the planning transaction guard capacity and essential shift edits', async () => {
  const { PlanningService } = require('../dist/planning/planning.service');
  const { IdentityService } = require('../dist/identity/identity.service');
  const { PrismaService } = require('../dist/prisma.service');
  const coordinator = await testDb.account('COORDINATOR');
  const { id, position, shiftPath } = await fullDraft(coordinator);
  const row = await write(coordinator, position, 'PUT', { capacity: 3 });
  const shiftId = shiftPath.split('/').at(-1);
  await testDb.db.$executeRaw`
    CREATE TABLE "SyntheticPositionActivity" (
      "positionId" uuid PRIMARY KEY, confirmed integer NOT NULL, offers integer NOT NULL, waiting integer NOT NULL
    )
  `;
  await testDb.db.$executeRaw`GRANT SELECT ON "SyntheticPositionActivity" TO voluntrack_app`;
  await testDb.db.$executeRaw`
    INSERT INTO "SyntheticPositionActivity" VALUES (${row.id}::uuid, 1, 1, 1)
  `;
  const capacityUpdates = [];
  const planning = new PlanningService(testDb.app.get(PrismaService), testDb.app.get(IdentityService), {
    async counts(tx, positionId) {
      const [result] = await tx.$queryRaw`
        SELECT confirmed, offers AS "activeOffers", waiting
        FROM "SyntheticPositionActivity" WHERE "positionId" = ${positionId}::uuid
      `;
      return result ?? { confirmed: 0, activeOffers: 0, waiting: 0 };
    },
    async capacityChanged(_tx, positionId, previous, current) {
      capacityUpdates.push([positionId, previous, current]);
    },
  });
  await expect(planning.savePosition(coordinator.raw, id, shiftId, role, { capacity: 0 }))
    .rejects.toMatchObject({ status: 409 });
  expect(await planning.savePosition(coordinator.raw, id, shiftId, role, { capacity: 2 }))
    .toMatchObject({ capacity: 2 });
  expect(capacityUpdates).toEqual([[row.id, 3, 2]]);
  await expect(planning.saveShift(coordinator.raw, id, { endsAt: new Date(stamp('14:30')) }, shiftId))
    .rejects.toMatchObject({ status: 409 });
});
