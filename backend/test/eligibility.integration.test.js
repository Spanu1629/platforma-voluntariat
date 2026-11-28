const { randomUUID } = require('node:crypto');
const { integration, observeTransactionQueries } = require('./eligibility-fixtures');

jest.setTimeout(30000);
const testDb = integration();
const path = '/eligibility/availability';
const weekly = [{ weekday: 7, intervals: [{ startMinute: 600, endMinute: 900 }] }];
const exceptions = [{ date: '2027-02-14', intervals: [] }];
const put = (actor, href, body, code = 200) => testDb.json(href, { actor, method: 'PUT', body }, code);
const readLink = async (tx, accountId) => tx.$queryRaw`
  SELECT "eventId", kind, "endsAt"
  FROM "SyntheticParticipationLink" WHERE "accountId" = ${accountId}::uuid
`;

async function permission(admin, coordinator, granted) {
  const response = await testDb.request(`/eligibility/training-permissions/${coordinator.id}`, {
    actor: admin, method: 'PUT', body: { granted },
  });
  expect(response.status).toBe(204);
}

async function event(actor) {
  return testDb.json('/planning/events', { actor, method: 'POST', body: {} }, 201);
}

async function link(accountId, eventId, kind, endsAt = null) {
  return testDb.db.$executeRaw`
    INSERT INTO "SyntheticParticipationLink" (id, "accountId", "eventId", kind, "endsAt")
    VALUES (${randomUUID()}::uuid, ${accountId}::uuid, ${eventId}::uuid, ${kind}, ${endsAt}::timestamptz)
  `;
}

beforeAll(async () => {
  await testDb.db.$executeRaw`
    CREATE TABLE "SyntheticParticipationLink" (
      id uuid PRIMARY KEY, "accountId" uuid NOT NULL, "eventId" uuid NOT NULL,
      kind text NOT NULL, "endsAt" timestamptz
    )
  `;
  await testDb.db.$executeRaw`GRANT SELECT ON "SyntheticParticipationLink" TO voluntrack_app`;
});

test('verified pending volunteers can replace, remove and retain availability after approval', async () => {
  const volunteer = await testDb.account('VOLUNTEER');
  const another = await testDb.account('VOLUNTEER');
  const unverified = await testDb.account('VOLUNTEER', { emailVerifiedAt: null });
  const header = await testDb.request(path, { actor: volunteer });
  expect(header.headers.get('cache-control')).toBe('no-store');
  expect((await testDb.request(path, { actor: unverified })).status).toBe(401);
  expect(await put(volunteer, path, { weekly, exceptions })).toEqual({ weekly, exceptions });
  expect(await testDb.json(path, { actor: another })).toEqual({ weekly: [], exceptions: [] });
  await testDb.db.identityAccount.update({ where: { id: volunteer.id }, data: { approvedAt: new Date() } });
  expect(await testDb.json(path, { actor: volunteer })).toEqual({ weekly, exceptions });
  expect(await put(volunteer, path, { weekly: [], exceptions: [] })).toEqual({ weekly: [], exceptions: [] });
});

test('policy defaults and alternate policies are read from PostgreSQL by planning', async () => {
  const admin = await testDb.account('ADMIN');
  const stored = await testDb.db.planningPolicy.findUniqueOrThrow({ where: { organizationId: 'voluntrack' } });
  expect(stored).toMatchObject({ breakThresholdMinutes: 240, minimumBreakMinutes: 30 });
  const draft = await event(admin);
  const route = `/planning/events/${draft.id}/shifts`;
  const shift = { startsAt: '2027-02-14T10:00:00+02:00', endsAt: '2027-02-14T12:00:00+02:00' };
  try {
    await testDb.db.planningPolicy.update({
      where: { organizationId: 'voluntrack' },
      data: { breakThresholdMinutes: 120, minimumBreakMinutes: 20 },
    });
    expect((await testDb.request(route, { actor: admin, method: 'POST', body: shift })).status).toBe(409);
    await testDb.json(route, { actor: admin, method: 'POST', body: {
      ...shift, breaks: [{ startsAt: '2027-02-14T11:00:00+02:00', endsAt: '2027-02-14T11:20:00+02:00' }],
    } }, 201);
  } finally {
    await testDb.db.planningPolicy.update({
      where: { organizationId: 'voluntrack' },
      data: { breakThresholdMinutes: 240, minimumBreakMinutes: 30 },
    });
  }
});

test('training permission rejects accounts of another organization without waiting for their row lock', async () => {
  const admin = await testDb.account('ADMIN');
  const outsider = await testDb.account('COORDINATOR', { organizationId: 'synthetic-outsider' });
  await testDb.db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "IdentityAccount" WHERE id = ${outsider.id}::uuid FOR UPDATE`;
    const response = await testDb.request(`/eligibility/training-permissions/${outsider.id}`, {
      actor: admin, method: 'PUT', body: { granted: true },
    });
    expect(response.status).toBe(404);
  });
});

test('the training service enforces live relationships and records confirmation, renewal and cross-event cancellation', async () => {
  const { TrainingService } = require('../dist/eligibility/training.service');
  const service = testDb.app.get(TrainingService);
  const volunteer = await testDb.account('VOLUNTEER', { approvedAt: new Date() });
  const admin = await testDb.account('ADMIN');
  const first = await testDb.account('COORDINATOR', { canApprove: true });
  const second = await testDb.account('COORDINATOR');
  const a = await event(first);
  const b = await event(second);
  const c = await event(second);
  const data = {
    type: 'SPECIALIZED', domain: 'Ateliere sintetice', trainer: 'Formator sintetic',
    completedOn: new Date('2026-11-10T00:00:00Z'), roleIds: ['creative-workshops', 'general-coordination'],
  };
  await link(volunteer.id, a.id, 'REQUEST_OPEN');
  await expect(service.confirm(first.raw, volunteer.id, data, readLink)).rejects.toMatchObject({ status: 403 });
  await permission(admin, first, true);
  await permission(admin, second, true);
  await expect(service.confirm(second.raw, volunteer.id, data, readLink)).rejects.toMatchObject({ status: 403 });
  const record = await service.confirm(first.raw, volunteer.id, data, readLink);
  const general = await service.confirm(first.raw, volunteer.id, {
    ...data, type: 'GENERAL', roleIds: [],
  }, readLink);
  expect(await service.qualifications(volunteer.id)).toMatchObject({
    general: true, roleIds: ['creative-workshops', 'general-coordination'],
  });
  await service.requestRenewal(first.raw, volunteer.id, record.id, readLink);
  expect((await service.qualifications(volunteer.id)).roleIds).toContain('creative-workshops');
  await link(volunteer.id, b.id, 'REQUEST_WITHDRAWN');
  await expect(service.cancel(second.raw, volunteer.id, record.id, 'Motiv sintetic', readLink))
    .rejects.toMatchObject({ status: 403 });
  await link(volunteer.id, c.id, 'QUEUE_SUSPENDED');
  await expect(service.cancel(second.raw, volunteer.id, record.id, '   ', readLink))
    .rejects.toMatchObject({ status: 400 });
  await service.cancel(second.raw, volunteer.id, record.id, 'Motiv sintetic', readLink);
  expect(await service.qualifications(volunteer.id)).toEqual({ general: true, roleIds: [] });
  const history = await testDb.db.trainingOperation.findMany({
    where: { recordId: record.id }, orderBy: { occurredAt: 'asc' },
  });
  expect(history.map(({ action, actorId, reason }) => [action, actorId, reason])).toEqual([
    ['CONFIRMED', first.id, null], ['RENEWAL_REQUESTED', first.id, null], ['CANCELED', second.id, 'Motiv sintetic'],
  ]);
  expect(await testDb.db.eligibilityReview.findFirst({
    where: { subjectId: volunteer.id, reason: 'TRAINING_CANCELED' },
  })).toBeTruthy();
  await testDb.db.$executeRaw`
    UPDATE "SyntheticParticipationLink" SET kind = 'REQUEST_REJECTED'
    WHERE "accountId" = ${volunteer.id}::uuid AND "eventId" = ${c.id}::uuid
  `;
  await expect(service.requestRenewal(second.raw, volunteer.id, general.id, readLink))
    .rejects.toMatchObject({ status: 403 });
  await permission(admin, first, false);
  await expect(service.requestRenewal(first.raw, volunteer.id, general.id, readLink))
    .rejects.toMatchObject({ status: 403 });
  expect((await testDb.request('/eligibility/trainings', { actor: second })).status).toBe(404);
});

test.each([
  ['REQUEST_OPEN', true], ['PROPOSAL_PENDING', true], ['QUEUE_WAITING', true], ['QUEUE_SUSPENDED', true],
  ['OFFER_ACTIVE', true], ['ASSIGNMENT_CONFIRMED', true], ['REQUEST_WITHDRAWN', false],
  ['REQUEST_REJECTED', false], ['OFFER_EXPIRED', false], ['ASSIGNMENT_COMPLETED', false],
  ['ASSIGNMENT_CANCELED', false],
])('status %s has the approved live relationship semantics', (kind, expected) => {
  const { activeParticipationLink } = require('../dist/eligibility/training.service');
  const now = new Date('2027-02-14T10:00:00Z');
  expect(activeParticipationLink({ kind, endsAt: new Date('2027-02-14T11:00:00Z') }, now)).toBe(expected);
  if (kind === 'ASSIGNMENT_CONFIRMED' || kind === 'OFFER_ACTIVE') {
    expect(activeParticipationLink({ kind, endsAt: now }, now)).toBe(false);
  }
});

test('profile changes invalidate verified identity atomically while contact changes preserve it', async () => {
  const { EligibilityService } = require('../dist/eligibility/eligibility.service');
  const service = testDb.app.get(EligibilityService);
  const volunteer = await testDb.account('VOLUNTEER', { approvedAt: new Date() });
  const edit = (body) => testDb.json('/identity/profile', { actor: volunteer, method: 'PATCH', body });
  await edit({ firstName: 'Prenume sintetic', lastName: 'Nume sintetic', birthDate: '2009-02-14' });
  expect(await service.verifiedIdentity(volunteer.id)).toBe(false);
  const verifier = await testDb.account('COORDINATOR');
  await testDb.db.volunteerIdentityVerification.create({ data: {
    accountId: volunteer.id, result: 'VERIFIED', verifiedAt: new Date(), verifierId: verifier.id,
  } });
  await edit({ phone: '0000000000' });
  expect(await service.verifiedIdentity(volunteer.id)).toBe(true);
  await edit({ birthDate: '2009-02-15' });
  expect(await service.verifiedIdentity(volunteer.id)).toBe(false);
  expect(await testDb.db.eligibilityReview.count({
    where: { subjectId: volunteer.id, reason: 'IDENTITY_INVALIDATED' },
  })).toBe(1);
  const audit = await testDb.db.identityAudit.findMany({ where: { targetId: volunteer.id } });
  expect(audit.map(({ action }) => action)).toContain('IDENTITY_VERIFICATION_INVALIDATED');
});

test('confirming a renewal links the records and preserves old confirmation history', async () => {
  const { TrainingService } = require('../dist/eligibility/training.service');
  const service = testDb.app.get(TrainingService);
  const admin = await testDb.account('ADMIN');
  const coordinator = await testDb.account('COORDINATOR');
  const volunteer = await testDb.account('VOLUNTEER', { approvedAt: new Date() });
  const { id } = await event(coordinator);
  await link(volunteer.id, id, 'PROPOSAL_PENDING');
  await permission(admin, coordinator, true);
  const data = {
    type: 'GENERAL', domain: 'Instruire generală sintetică', trainer: 'Formator sintetic',
    completedOn: new Date('2026-11-10T00:00:00Z'), roleIds: [],
  };
  const original = await service.confirm(coordinator.raw, volunteer.id, data, readLink);
  await service.requestRenewal(coordinator.raw, volunteer.id, original.id, readLink);
  const replacement = await service.confirm(coordinator.raw, volunteer.id, {
    ...data, completedOn: new Date('2026-11-11T00:00:00Z'), renewsRecordId: original.id,
  }, readLink);
  expect(await testDb.db.trainingRecord.findUnique({ where: { id: original.id } }))
    .toMatchObject({ supersededById: replacement.id });
  await service.cancel(coordinator.raw, volunteer.id, replacement.id, 'Motiv sintetic', readLink);
  expect(await service.qualifications(volunteer.id)).toEqual({ general: false, roleIds: [] });
  expect(await testDb.db.trainingOperation.count({ where: { recordId: original.id } })).toBe(2);
});

test('eligibility uses live profile, availability, requirements and a verified result before confirmation', async () => {
  const { EligibilityService } = require('../dist/eligibility/eligibility.service');
  const { PrismaService } = require('../dist/prisma.service');
  const { TrainingService } = require('../dist/eligibility/training.service');
  const evaluator = testDb.app.get(EligibilityService);
  const appDb = testDb.app.get(PrismaService);
  const training = testDb.app.get(TrainingService);
  const admin = await testDb.account('ADMIN');
  const coordinator = await testDb.account('COORDINATOR');
  const volunteer = await testDb.account('VOLUNTEER', { approvedAt: new Date() });
  await testDb.json('/identity/profile', { actor: volunteer, method: 'PATCH', body: {
    firstName: 'Prenume sintetic', lastName: 'Nume sintetic', birthDate: '2012-02-14',
  } });
  await put(volunteer, path, { weekly, exceptions: [] });
  const draft = await event(coordinator);
  const href = `/planning/events/${draft.id}`;
  await testDb.json(href, { actor: coordinator, method: 'PATCH', body: { title: 'Test', description: 'Descriere de test' } });
  const location = await testDb.json(href + '/locations', { actor: coordinator, method: 'POST', body: { name: 'Loc test' } }, 201);
  const shift = await testDb.json(href + '/shifts', { actor: coordinator, method: 'POST', body: {
    locationId: location.id, startsAt: '2027-02-14T10:00:00+02:00', endsAt: '2027-02-14T13:00:00+02:00',
  } }, 201);
  const positionRoute = `${href}/shifts/${shift.id}/positions/creative-workshops`;
  const position = await put(coordinator, positionRoute, { capacity: 1, tasks: 'Sarcini sintetice' });
  expect((await testDb.request(href + '/publish', { actor: coordinator, method: 'POST' })).status).toBe(204);
  const emptySchedule = async () => [];
  const preliminary = () => appDb.$transaction((tx) => evaluator.evaluatePreliminary(tx, volunteer.id, position.id, emptySchedule));
  const confirmation = () => appDb.$transaction((tx) => evaluator.requireForConfirmation(tx, volunteer.id, position.id, emptySchedule));
  expect((await preliminary()).issues).toEqual(expect.arrayContaining([
    'POSITION_NOT_CONFIRMED_FOR_MINORS', 'SUPERVISION_NOT_CONFIRMED', 'GENERAL_TRAINING_REQUIRED', 'SPECIALIZED_TRAINING_REQUIRED',
  ]));
  await put(coordinator, positionRoute + '/adequacy', { confirmed: true });
  expect((await preliminary()).issues).not.toContain('POSITION_NOT_CONFIRMED_FOR_MINORS');
  expect((await preliminary()).issues).toContain('SUPERVISION_NOT_CONFIRMED');
  await put(coordinator, positionRoute + '/supervision', { confirmed: true });
  await permission(admin, coordinator, true);
  await link(volunteer.id, draft.id, 'REQUEST_OPEN');
  const facts = { domain: 'Domeniu sintetic', trainer: 'Formator sintetic', completedOn: new Date('2026-11-10') };
  await training.confirm(coordinator.raw, volunteer.id, { ...facts, type: 'GENERAL', roleIds: [] }, readLink);
  await training.confirm(coordinator.raw, volunteer.id, {
    ...facts, type: 'SPECIALIZED', roleIds: ['general-coordination'],
  }, readLink);
  expect((await preliminary()).issues).toEqual(['SPECIALIZED_TRAINING_REQUIRED']);
  await training.confirm(coordinator.raw, volunteer.id, {
    ...facts, type: 'SPECIALIZED', roleIds: ['creative-workshops'],
  }, readLink);
  expect(await preliminary()).toEqual({ issues: [], effectiveMinutes: 180 });
  await expect(confirmation()).rejects.toMatchObject({
    status: 409, response: { issues: ['IDENTITY_VERIFICATION_REQUIRED'] },
  });
  await testDb.db.volunteerIdentityVerification.create({ data: {
    accountId: volunteer.id, result: 'VERIFIED', verifiedAt: new Date(), verifierId: coordinator.id,
  } });
  const { transactions } = await observeTransactionQueries(async () => {
    await preliminary();
    expect(await confirmation()).toEqual({ issues: [], effectiveMinutes: 180 });
  });
  expect(transactions.map(({ overlaps }) => overlaps)).toEqual([0, 0]);

  const outsider = await testDb.account('VOLUNTEER', { organizationId: 'synthetic-outsider', approvedAt: new Date() });
  await expect(appDb.$transaction((tx) => evaluator.evaluatePreliminary(tx, outsider.id, position.id, emptySchedule)))
    .rejects.toMatchObject({ status: 404 });
});
