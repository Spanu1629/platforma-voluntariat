const { integration, observeTransactionQueries } = require('./eligibility-fixtures');

jest.setTimeout(30000);
const fixtures = integration();
const root = '/participation';
const actorRequest = (actor, path, method, body) =>
  fixtures.request(root + path, { actor, method, body });
const create = (actor, path, body) => fixtures.json(root + path, { actor, method: 'POST', body }, 201);
const nextDay = new Date();
nextDay.setUTCDate(nextDay.getUTCDate() + 5);
nextDay.setUTCHours(8, 0, 0, 0);
const hour = 3600000;

async function setup(count = 2, options = {}) {
  const coordinator = await fixtures.account('COORDINATOR');
  const event = await fixtures.db.planningEvent.create({ data: {
    organizationId: 'voluntrack', title: 'Eveniment sintetic', description: 'Descriere', publishedAt: new Date(),
  } });
  await fixtures.db.planningCoordinator.create({ data: { eventId: event.id, accountId: coordinator.id } });
  const location = await fixtures.db.planningLocation.create({ data: { eventId: event.id, name: 'Loc sintetic' } });
  const shift = await fixtures.db.planningShift.create({ data: {
    eventId: event.id, locationId: location.id, startsAt: nextDay, endsAt: new Date(+nextDay + 2 * hour),
  } });
  const position = await fixtures.db.planningPosition.create({ data: { shiftId: shift.id, roleId: 'ticket-checking', capacity: 1 } });
  const volunteers = [];
  for (let index = 0; index < count; index++) {
    const volunteer = await fixtures.account('VOLUNTEER', { approvedAt: new Date() });
    await fixtures.db.identityProfile.create({ data: { accountId: volunteer.id, birthDate: new Date('1995-01-01') } });
    await fixtures.db.volunteerAvailability.create({ data: {
      accountId: volunteer.id, weekly: Array.from({ length: 7 }, (_, day) => ({
        weekday: day + 1, intervals: [{ startMinute: 0, endMinute: 1440 }],
      })), exceptions: [],
    } });
    if (!options.unverified) await fixtures.db.volunteerIdentityVerification.create({ data: {
      accountId: volunteer.id, result: 'VERIFIED', verifiedAt: new Date(), verifierId: coordinator.id,
    } });
    await fixtures.db.trainingRecord.create({ data: {
      accountId: volunteer.id, type: 'GENERAL', domain: 'Sintetic', trainer: 'Formator',
      completedOn: new Date('2020-01-01'), confirmedBy: coordinator.id, confirmedAt: new Date(),
    } });
    volunteers.push(volunteer);
  }
  return { coordinator, event, shift, position, volunteers };
}

async function propose(event, coordinator, target, position, replacesId) {
  const request = await create(target, `/events/${event.id}/requests`);
  const proposal = await create(coordinator, `/requests/${request.id}/proposals`, { positionId: position.id, replacesId });
  return { request, proposal };
}

const respond = (actor, placement, accept = true) =>
  actorRequest(actor, `/placements/${placement.id}/response`, 'PUT', { accept });

test('the last seat is reserved once, and an older eligible queue entry has priority', async () => {
  const { coordinator, event, position, volunteers: [first, second, newcomer] } = await setup(3);
  const a = await propose(event, coordinator, first, position);
  const b = await propose(event, coordinator, second, position);
  const c = await propose(event, coordinator, newcomer, position);
  const { result: replies, transactions } = await observeTransactionQueries(async () =>
    Promise.all([[first, a], [second, b]].map(async ([volunteer, { proposal }]) => {
      const response = await respond(volunteer, proposal);
      expect(response.status).toBe(200);
      return { volunteer, placement: await response.json() };
    })),
  );
  expect(transactions.every(({ overlaps }) => overlaps === 0)).toBe(true);
  expect(replies.map(({ placement }) => placement.state).sort()).toEqual(['CONFIRMED', 'QUEUED']);
  const confirmed = replies.find(({ placement }) => placement.state === 'CONFIRMED');
  const queued = replies.find(({ placement }) => placement.state === 'QUEUED');
  expect((await actorRequest(confirmed.volunteer, `/placements/${confirmed.placement.id}/withdraw`, 'PUT', {})).status).toBe(204);
  const reply = await respond(newcomer, c.proposal);
  expect(reply.status).toBe(200);
  expect((await reply.json()).state).toBe('QUEUED');
  const offered = await fixtures.db.participationPlacement.findUnique({ where: { id: queued.placement.id } });
  expect(offered.state).toBe('OFFERED');
  expect(+offered.expiresAt).toBeLessThanOrEqual(+nextDay);
  expect((await (await respond(queued.volunteer, offered)).json()).state).toBe('CONFIRMED');
});

test('identity is required after proposal and a refused proposal leaves the same request open', async () => {
  const { coordinator, event, position, volunteers: [volunteer] } = await setup(1, { unverified: true });
  const { request, proposal } = await propose(event, coordinator, volunteer, position);
  expect((await respond(volunteer, proposal)).status).toBe(409);
  const denied = await respond(coordinator, proposal);
  expect(denied.status).toBe(404);
  expect((await (await respond(volunteer, proposal, false)).json()).state).toBe('DECLINED');
  expect((await create(volunteer, `/events/${event.id}/requests`)).id).toBe(request.id);
});

test('a replacement in a full position keeps its source until the new seat is confirmed', async () => {
  const { coordinator, event, shift, position, volunteers: [volunteer, occupant] } = await setup();
  const destination = await fixtures.db.planningPosition.create({ data: {
    shiftId: shift.id, roleId: 'materials-distribution', capacity: 1,
  } });
  const source = await propose(event, coordinator, volunteer, position);
  await respond(volunteer, source.proposal);
  const occupied = await propose(event, coordinator, occupant, destination);
  await respond(occupant, occupied.proposal);
  const move = await create(coordinator, `/requests/${source.request.id}/proposals`, {
    positionId: destination.id, replacesId: source.proposal.id,
  });
  expect((await (await respond(volunteer, move)).json()).state).toBe('QUEUED');
  const read = (id) => fixtures.db.participationPlacement.findUnique({ where: { id } });
  expect((await read(source.proposal.id)).state).toBe('CONFIRMED');
  expect((await actorRequest(occupant, `/placements/${occupied.proposal.id}/withdraw`, 'PUT', {})).status).toBe(204);
  const { ParticipationJobs } = require('../dist/participation/participation-jobs');
  await fixtures.app.get(ParticipationJobs).tick();
  expect((await read(move.id)).state).toBe('OFFERED');
  expect((await (await respond(volunteer, move)).json()).state).toBe('CONFIRMED');
  expect((await read(source.proposal.id)).state).toBe('REPLACED');
});

test('an expired offer never confirms and another worker can resume processing stored jobs', async () => {
  const { coordinator, event, position, volunteers: [first, second, third] } = await setup(3);
  const a = await propose(event, coordinator, first, position);
  const b = await propose(event, coordinator, second, position);
  const c = await propose(event, coordinator, third, position);
  await respond(first, a.proposal);
  await respond(second, b.proposal);
  await respond(third, c.proposal);
  expect((await actorRequest(first, `/placements/${a.proposal.id}/withdraw`, 'PUT', {})).status).toBe(204);
  const { ParticipationJobs } = require('../dist/participation/participation-jobs');
  const { PrismaService } = require('../dist/prisma.service');
  const { ParticipationService } = require('../dist/participation/participation.service');
  const firstWorker = fixtures.app.get(ParticipationJobs);
  await firstWorker.tick();
  const read = (id) => fixtures.db.participationPlacement.findUnique({ where: { id } });
  expect((await read(b.proposal.id)).state).toBe('OFFERED');
  const elapsed = new Date(Date.now() - 1000);
  await fixtures.db.participationPlacement.update({ where: { id: b.proposal.id }, data: { expiresAt: elapsed } });
  await fixtures.db.participationJob.updateMany({ where: { targetId: position.id }, data: { dueAt: elapsed } });
  expect((await respond(second, b.proposal)).status).toBe(409);
  const restarted = new ParticipationJobs(fixtures.app.get(PrismaService), fixtures.app.get(ParticipationService));
  await Promise.all([restarted.tick(), firstWorker.tick()]);
  expect((await read(b.proposal.id)).state).toBe('EXPIRED');
  expect((await read(c.proposal.id)).state).toBe('OFFERED');
});
