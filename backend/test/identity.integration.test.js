const { createHash, randomBytes, randomUUID } = require('node:crypto');
const { inspect } = require('node:util');
const { Logger } = require('@nestjs/common');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/generated/prisma/client');
const { createApplication } = require('../dist/main');

jest.setTimeout(30000);

const origin = 'https://identity.example.invalid';
const csrfCookie = '__Host-voluntrack-csrf';
const sessionCookie = '__Host-voluntrack-session';
const minute = 60_000;
const hour = 60 * minute;
let password;
let migrator;
let app;
let url;

function syntheticAddress() {
  return `fixture-${randomUUID()}@example.invalid`;
}

function cookies(response, name) {
  return response.headers.getSetCookie().find((value) => value.startsWith(`${name}=`));
}

function sessionDigest(cookie) {
  return createHash('sha256').update(cookie.split(';')[0].slice(sessionCookie.length + 1)).digest('hex');
}

async function startApp() {
  app = await createApplication({ logger: false, abortOnError: false });
  await app.listen(0, '127.0.0.1');
  url = await app.getUrl();
}

beforeAll(async () => {
  const { DATABASE_URL, TEST_APP_URL } = process.env;
  if (!DATABASE_URL || !TEST_APP_URL) throw new Error('Run backend/test/run-integration.sh.');
  migrator = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });
  process.env.DATABASE_URL = TEST_APP_URL;
  process.env.IDENTITY_PUBLIC_URL = origin;
  process.env.IDENTITY_SECRET = randomBytes(32).toString('hex');
  process.env.IDENTITY_MAIL_TRANSPORT = 'simulated';
  password = `A1${randomBytes(16).toString('hex')}`;
  await startApp();
});

afterAll(async () => {
  await app?.close();
  await migrator?.$disconnect();
});

async function csrf() {
  const response = await fetch(`${url}/identity/csrf`);
  expect(response.status).toBe(200);
  const cookie = cookies(response, csrfCookie);
  expect(cookie).toBeDefined();
  return { cookie: cookie.split(';')[0], token: (await response.json()).token };
}

async function request(path, { method = 'GET', body, session, protection = true, from = origin } = {}) {
  const headers = { Origin: from };
  const jar = session ? [session.split(';')[0]] : [];
  if (method !== 'GET' && protection) {
    const proof = await csrf();
    jar.push(proof.cookie);
    headers['X-CSRF-Token'] = proof.token;
  }
  if (jar.length) headers.Cookie = jar.join('; ');
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(`${url}/identity${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function login(email, value = password) {
  return request('/login', { method: 'POST', body: { email, password: value } });
}

async function sessionFor(email, value) {
  const response = await login(email, value);
  expect(response.status).toBe(200);
  const cookie = cookies(response, sessionCookie);
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('Secure');
  expect(cookie).toContain('SameSite=Lax');
  return cookie;
}

function mailServices() {
  const { IdentityMailWorker, SimulatedIdentityDelivery } = require('../dist/identity/identity-mail');
  return { worker: app.get(IdentityMailWorker), delivery: app.get(SimulatedIdentityDelivery) };
}

function pendingVolunteerFixture({ passwordHash, issuedAt = new Date() } = {}) {
  const { enqueueChallenge } = require('../dist/identity/identity-store');
  return migrator.$transaction(async (tx) => {
    const account = await tx.identityAccount.create({
      data: { email: syntheticAddress(), passwordHash, role: 'VOLUNTEER', locale: 'ro', organizationId: 'voluntrack' },
    });
    await enqueueChallenge(tx, account.id, 'VERIFY_EMAIL', issuedAt);
    return account;
  });
}

async function deliveredTo(email) {
  const { worker, delivery } = mailServices();
  for (let i = 0; i < 30 && !delivery.messages.some((message) => message.to === email); i++) {
    await worker.deliverNext();
  }
  const message = delivery.messages.findLast((entry) => entry.to === email);
  expect(message).toBeDefined();
  const link = new URL(message.link);
  expect(link.origin).toBe(origin);
  return { message, path: link.pathname.replace('/identity', ''), token: new URLSearchParams(link.hash.slice(1)).get('token') };
}

async function register(email = syntheticAddress(), locale = 'ro') {
  const response = await request('/register', { method: 'POST', body: { email, locale } });
  expect(response.status).toBe(202);
  return email;
}

async function verify(email) {
  const { token } = await deliveredTo(email);
  expect((await request('/email/verify', { method: 'POST', body: { token, password } })).status).toBe(204);
}

async function volunteer() {
  const email = await register();
  await verify(email);
  const session = await sessionFor(email);
  return { email, session, account: await migrator.identityAccount.findUniqueOrThrow({ where: { email } }) };
}

let initialAdmin;
async function administrator() {
  if (!initialAdmin) {
    expect((await request('/profile')).status).toBe(401);
    const { bootstrapAdministrator } = require('../dist/identity/bootstrap-admin');
    const email = syntheticAddress();
    const account = await bootstrapAdministrator(migrator, email, password);
    initialAdmin = { email, account };
  }
  return { ...initialAdmin, session: await sessionFor(initialAdmin.email) };
}

async function staff(actor, role) {
  const email = syntheticAddress();
  const created = await request('/staff', { method: 'POST', session: actor.session, body: { email, role } });
  expect(created.status).toBe(201);
  const account = await created.json();
  const { token } = await deliveredTo(email);
  expect((await request('/staff/activate', { method: 'POST', body: { token, password } })).status).toBe(204);
  expect((await request('/staff/activate', { method: 'POST', body: { token, password } })).status).toBe(400);
  return { email, account, session: await sessionFor(email) };
}

test('registration verifies email once and grants access to the pending volunteer profile', async () => {
  const email = await register(syntheticAddress(), 'en');
  expect((await login(email)).status).toBe(401);
  const row = await migrator.identityAccount.findUniqueOrThrow({ where: { email } });
  expect(row.role).toBe('VOLUNTEER');
  expect(row.approvedAt).toBeNull();
  expect(row.passwordHash).toBeNull();
  const { token, message, path } = await deliveredTo(email);
  expect(path).toBe('/email/verify');
  expect(message.subject).toMatch(/verify/i);
  expect((await request(path)).status).toBe(200);
  const results = await Promise.all([1, 2].map(() => request(path, { method: 'POST', body: { token, password } })));
  expect(results.map((result) => result.status).sort()).toEqual([204, 400]);
  const verified = await migrator.identityAccount.findUniqueOrThrow({ where: { email } });
  expect(verified.passwordHash).toMatch(/^\$argon2id\$/);
  const session = await sessionFor(email);
  const profile = await request('/profile', {
    method: 'PATCH', session, body: { firstName: 'Synthetic', lastName: 'Volunteer', birthDate: '2000-04-02', phone: '0000000000', locality: 'Fixture' },
  });
  expect(profile.status).toBe(200);
  expect(await profile.json()).toMatchObject({ email, firstName: 'Synthetic', birthDate: '2000-04-02', approved: false });
  expect((await request('/profile', { method: 'PATCH', session, body: { role: 'ADMIN' } })).status).toBe(400);
  expect((await request('/profile', { method: 'PATCH', session, body: { birthDate: '2000-02-30' } })).status).toBe(400);
  const logout = await request('/logout', { method: 'POST', session });
  expect(logout.status).toBe(204);
  expect((await request('/profile', { session })).status).toBe(401);
});

test('registration acknowledges duplicate addresses without replacing the pending account or sending again', async () => {
  const email = syntheticAddress();
  const create = (body) => request('/register', { method: 'POST', body });
  expect((await create({ email, password })).status).toBe(400);
  const first = await create({ email });
  const duplicate = await create({ email, locale: 'en' });
  expect(first.status).toBe(202);
  expect(duplicate.status).toBe(202);
  expect(await duplicate.text()).toBe(await first.text());
  const account = await migrator.identityAccount.findUniqueOrThrow({ where: { email } });
  expect(account).toMatchObject({ locale: 'ro', passwordHash: null });
  expect(await migrator.identityMailJob.count({ where: { challenge: { accountId: account.id } } })).toBe(1);
});

test('verification replaces a password hash from a previously registered pending account', async () => {
  const { hashPassword } = require('../dist/identity/identity-input');
  const previousPassword = `B2${randomBytes(16).toString('hex')}`;
  const { email } = await pendingVolunteerFixture({ passwordHash: await hashPassword(previousPassword) });
  const { token, path } = await deliveredTo(email);
  expect((await login(email, previousPassword)).status).toBe(401);
  expect((await request(path, { method: 'POST', body: { token, password } })).status).toBe(204);
  expect((await login(email, previousPassword)).status).toBe(401);
  await sessionFor(email);
});

test('password policy and CSRF cover anonymous and authenticated mutations', async () => {
  const email = await register();
  const { token, path } = await deliveredTo(email);
  expect((await request(path, { method: 'POST', body: { token } })).status).toBe(400);
  for (const invalid of ['A1' + 'a'.repeat(7), 'a1' + 'a'.repeat(8), 'Aa'.repeat(5), 'A1' + 'a'.repeat(127)]) {
    expect((await request(path, { method: 'POST', body: { token, password: invalid } })).status).toBe(400);
  }
  const pending = await migrator.identityAccount.findUniqueOrThrow({ where: { email } });
  expect(pending).toMatchObject({ passwordHash: null, activatedAt: null, emailVerifiedAt: null });
  expect((await request('/register', { method: 'POST', body: { email }, protection: false })).status).toBe(403);
  expect((await request('/register', { method: 'POST', body: { email }, from: 'https://other.example.invalid' })).status).toBe(403);
  expect((await request(path, { method: 'POST', body: { token, password }, protection: false })).status).toBe(403);
  const longestPassword = 'A1' + 'a'.repeat(126);
  expect((await request(path, { method: 'POST', body: { token, password: longestPassword } })).status).toBe(204);
  await sessionFor(email, longestPassword);
  const person = await volunteer();
  expect((await request('/profile', { method: 'PATCH', session: person.session, body: { firstName: 'Fixture' }, protection: false })).status).toBe(403);
});

test('logout revokes the session and clears the cookie idempotently with valid CSRF', async () => {
  const person = await administrator();
  const active = person.session;
  const expired = await sessionFor(person.email);
  await migrator.identitySession.update({ where: { digest: sessionDigest(expired) }, data: { lastSeenAt: new Date(Date.now() - 24 * hour) } });

  for (const options of [{ protection: false }, { from: 'https://other.example.invalid' }]) {
    expect((await request('/logout', { method: 'POST', session: active, ...options })).status).toBe(403);
    expect((await request('/profile', { session: active })).status).toBe(200);
  }

  for (const session of [active, active, expired, undefined]) {
    const response = await request('/logout', { method: 'POST', session });
    expect(response.status).toBe(204);
    expect(cookies(response, sessionCookie)).toMatch(/^__Host-voluntrack-session=;.*Expires=/i);
  }
  expect(await migrator.identitySession.findUnique({ where: { digest: sessionDigest(active) } })).toBeNull();
  expect((await request('/profile', { session: active })).status).toBe(401);
});

test('sessions expire on inactivity or maximum age and reset revokes all sessions', async () => {
  const person = await volunteer();
  const second = await sessionFor(person.email);
  await migrator.identitySession.update({ where: { digest: sessionDigest(person.session) }, data: { lastSeenAt: new Date(Date.now() - 24 * hour) } });
  await migrator.identitySession.update({ where: { digest: sessionDigest(second) }, data: { createdAt: new Date(Date.now() - 7 * 24 * hour) } });
  for (const session of [person.session, second]) expect((await request('/profile', { session })).status).toBe(401);
  const firstLive = await sessionFor(person.email);
  const secondLive = await sessionFor(person.email);
  const newPassword = `B2${randomBytes(16).toString('hex')}`;
  const unknown = await request('/password/request', { method: 'POST', body: { email: syntheticAddress() } });
  const known = await request('/password/request', { method: 'POST', body: { email: person.email } });
  expect(unknown.status).toBe(202);
  expect(known.status).toBe(202);
  expect(await unknown.text()).toBe(await known.text());
  const { worker, delivery } = mailServices();
  await worker.deliverNext();
  const reset = delivery.messages.findLast((message) => message.to === person.email);
  const token = new URLSearchParams(new URL(reset.link).hash.slice(1)).get('token');
  expect(new URL(reset.link).pathname).toBe('/identity/password/reset');
  const results = await Promise.all([1, 2].map(() => request('/password/reset', { method: 'POST', body: { token, password: newPassword } })));
  expect(results.map((result) => result.status).sort()).toEqual([204, 400]);
  for (const session of [firstLive, secondLive]) expect((await request('/profile', { session })).status).toBe(401);
  expect((await login(person.email)).status).toBe(401);
  await sessionFor(person.email, newPassword);
});

test('email verification and password reset reject expired challenges without applying their effects', async () => {
  const email = await register();
  const { token } = await deliveredTo(email);
  const account = await migrator.identityAccount.findUniqueOrThrow({ where: { email } });
  const verification = await migrator.identityChallenge.findFirstOrThrow({ where: { accountId: account.id, purpose: 'VERIFY_EMAIL' } });
  expect(verification.expiresAt - verification.createdAt).toBe(24 * hour);
  await migrator.identityChallenge.update({ where: { id: verification.id }, data: { expiresAt: new Date(Date.now() - 1) } });
  expect((await request('/email/verify', { method: 'POST', body: { token, password } })).status).toBe(400);
  expect((await login(email)).status).toBe(401);

  const person = await volunteer();
  expect((await request('/password/request', { method: 'POST', body: { email: person.email } })).status).toBe(202);
  const { worker, delivery } = mailServices();
  await worker.deliverNext();
  const reset = delivery.messages.findLast((message) => message.to === person.email);
  const expiredToken = new URLSearchParams(new URL(reset.link).hash.slice(1)).get('token');
  const challenge = await migrator.identityChallenge.findFirstOrThrow({ where: { accountId: person.account.id, purpose: 'RESET_PASSWORD' } });
  expect(challenge.expiresAt - challenge.createdAt).toBe(30 * minute);
  await migrator.identityChallenge.update({ where: { id: challenge.id }, data: { expiresAt: new Date(Date.now() - 1) } });
  expect((await request('/password/reset', { method: 'POST', body: { token: expiredToken, password } })).status).toBe(400);
  expect((await request('/profile', { session: person.session })).status).toBe(200);
});

test('approval and delegation are restricted and audited', async () => {
  const admin = await administrator();
  const coordinator = await staff(admin, 'COORDINATOR');
  const target = await volunteer();
  const another = await volunteer();
  const approve = (id, session) => request(`/accounts/${id}/approve`, { method: 'POST', session });
  expect((await approve(target.account.id, another.session)).status).toBe(403);
  expect((await approve(target.account.id, coordinator.session)).status).toBe(403);
  const pendingEmail = await register();
  const unverified = await migrator.identityAccount.findUniqueOrThrow({ where: { email: pendingEmail } });
  expect((await approve(unverified.id, admin.session)).status).toBe(409);
  const delegate = `/delegations/${coordinator.account.id}`;
  expect((await request(delegate, { method: 'PUT', session: coordinator.session })).status).toBe(403);
  expect((await request(delegate, { method: 'PUT', session: admin.session })).status).toBe(204);
  expect((await approve(coordinator.account.id, coordinator.session)).status).toBe(404);
  await migrator.identityAccount.update({ where: { id: another.account.id }, data: { organizationId: 'synthetic-other-organization' } });
  expect((await approve(another.account.id, coordinator.session)).status).toBe(404);
  expect((await approve(target.account.id, coordinator.session)).status).toBe(204);
  expect((await request(delegate, { method: 'DELETE', session: admin.session })).status).toBe(204);
  expect((await approve(target.account.id, coordinator.session)).status).toBe(403);
  const profile = await request('/profile', { session: target.session });
  expect((await profile.json()).approved).toBe(true);
  const audit = await migrator.identityAudit.findMany({
    where: { targetId: { in: [coordinator.account.id, target.account.id] } }, orderBy: { action: 'asc' },
  });
  expect(audit.map((entry) => entry.action)).toEqual(expect.arrayContaining([
    'ACCOUNT_APPROVED', 'DELEGATION_GRANTED', 'DELEGATION_REVOKED',
  ]));
  expect(audit.find((entry) => entry.action === 'ACCOUNT_APPROVED').actorId).toBe(coordinator.account.id);
});

test('unactivated staff can request a fresh activation email after the original expires', async () => {
  const admin = await administrator();
  const email = syntheticAddress();
  const created = await request('/staff', { method: 'POST', session: admin.session, body: { email, role: 'COORDINATOR' } });
  expect(created.status).toBe(201);
  const account = await created.json();
  const { token } = await deliveredTo(email);
  const challenge = await migrator.identityChallenge.findFirstOrThrow({
    where: { accountId: account.id, purpose: 'ACTIVATE_STAFF' },
  });
  await migrator.identityChallenge.update({
    where: { id: challenge.id }, data: { expiresAt: new Date(Date.now() - 1) },
  });
  expect((await request('/staff/activate', { method: 'POST', body: { token, password } })).status).toBe(400);
  expect((await request('/email/request', { method: 'POST', body: { email } })).status).toBe(202);
  const { worker, delivery } = mailServices();
  while (await worker.deliverNext()) {}
  const renewed = delivery.messages.filter((message) => message.to === email);
  expect(renewed.length).toBe(2);
  const freshToken = new URLSearchParams(new URL(renewed.at(-1).link).hash.slice(1)).get('token');
  expect((await request('/staff/activate', { method: 'POST', body: { token: freshToken, password } })).status).toBe(204);
  await sessionFor(email);
});

test('first administrator is initialized once and the last active administrator survives concurrent changes', async () => {
  const admin = await administrator();
  const { bootstrapAdministrator } = require('../dist/identity/bootstrap-admin');
  await expect(bootstrapAdministrator(migrator, syntheticAddress(), password)).rejects.toThrow();
  const second = await staff(admin, 'ADMIN');
  const results = await Promise.all([
    request(`/staff/${admin.account.id}`, { method: 'PATCH', session: admin.session, body: { disabled: true } }),
    request(`/staff/${second.account.id}`, { method: 'PATCH', session: second.session, body: { role: 'COORDINATOR' } }),
  ]);
  expect(results.map((result) => result.status).sort()).toEqual([204, 409]);
  expect(await migrator.identityAccount.count({ where: { role: 'ADMIN', emailVerifiedAt: { not: null }, activatedAt: { not: null }, disabledAt: null } })).toBe(1);
});

test('pending email delivery survives app restart and retries with the same link and key', async () => {
  const email = await register();
  let { worker, delivery } = mailServices();
  await worker.deliverNext();
  // Other scenarios may have queued messages. Drain them before isolating this retry.
  while (await worker.deliverNext()) {}
  const retryEmail = await register();
  const send = jest.spyOn(delivery, 'send').mockRejectedValueOnce(new Error('simulated timeout'));
  expect(await worker.deliverNext()).toBe(true);
  const attempted = send.mock.calls[0][0];
  expect(attempted.to).toBe(retryEmail);
  expect(attempted.subject).toMatch(/verific/i);
  const job = await migrator.identityMailJob.findFirstOrThrow({ where: { challenge: { account: { email: retryEmail } } } });
  expect(JSON.stringify(job)).not.toContain(attempted.link);
  expect(job.state).toBe('PENDING');
  send.mockRestore();
  await app.close();
  await startApp();
  ({ worker, delivery } = mailServices());
  expect(await worker.deliverNext(new Date(Date.now() + minute))).toBe(true);
  expect(delivery.messages.length).toBe(1);
  expect(JSON.stringify(delivery.messages[0]) === JSON.stringify(attempted)).toBe(true);
  expect(await worker.deliverNext(new Date(Date.now() + minute))).toBe(false);
  expect((await migrator.identityMailJob.findUniqueOrThrow({ where: { id: job.id } })).state).toBe('SENT');
  expect(email).not.toBe(retryEmail);
});

test('an ambiguous delivery moves to review at expiry without another send', async () => {
  const { worker, delivery } = mailServices();
  while (await worker.deliverNext()) {}
  const issuedAt = new Date();
  const account = await pendingVolunteerFixture({ issuedAt });
  const send = jest.spyOn(delivery, 'send').mockRejectedValueOnce(new Error('simulated timeout'));
  try {
    expect(await worker.deliverNext(issuedAt)).toBe(true);
    const job = await migrator.identityMailJob.findFirstOrThrow({
      where: { challenge: { accountId: account.id } }, include: { challenge: true },
    });
    expect(job).toMatchObject({ state: 'PENDING', attempts: 1 });
    const expiresAt = job.challenge.expiresAt;
    expect(await worker.deliverNext(expiresAt)).toBe(true);
    expect(await migrator.identityMailJob.findUniqueOrThrow({ where: { id: job.id } })).toMatchObject({
      state: 'REVIEW', attempts: 1, leaseUntil: null,
    });
    expect(await worker.deliverNext(new Date(expiresAt.getTime() + 1))).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  } finally {
    send.mockRestore();
  }
});

test('identity API and worker errors log generic messages without sensitive data', async () => {
  const { IdentityService } = require('../dist/identity/identity.service');
  const identity = app.get(IdentityService);
  const { worker } = mailServices();
  const token = randomBytes(32).toString('base64url');
  const link = `${origin}/identity/email/verify#token=${token}`;
  const markers = [token, link, syntheticAddress(), randomBytes(32).toString('hex')];
  const failure = new Error(markers.join(' '));
  const profile = jest.spyOn(identity, 'profile').mockRejectedValueOnce(failure);
  const workerTick = jest.spyOn(worker, 'tick').mockRejectedValueOnce(failure);
  const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

  try {
    const response = await request('/profile', { session: `${sessionCookie}=${token}` });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ statusCode: 500, message: 'Internal server error' });

    let tick;
    const schedule = jest.spyOn(globalThis, 'setInterval').mockImplementationOnce((callback) => {
      tick = callback;
      return { unref() {} };
    });
    const environment = jest.replaceProperty(process, 'env', { ...process.env, NODE_ENV: 'development' });
    try {
      worker.onModuleInit();
    } finally {
      environment.restore();
      schedule.mockRestore();
    }
    tick();
    await worker.onModuleDestroy();

    const output = inspect([error.mock.calls, warn.mock.calls], { depth: null });
    expect(markers.every((marker) => !output.includes(marker))).toBe(true);
    expect(error.mock.calls.some(([message]) => message === 'Unexpected identity API failure.')).toBe(true);
    expect(warn.mock.calls.some(([message]) => message === 'Identity background processing failed and will retry.')).toBe(true);
  } finally {
    profile.mockRestore();
    workerTick.mockRestore();
    error.mockRestore();
    warn.mockRestore();
  }
});

test('login throttles after five failures and caps attempts from the same IP', async () => {
  await migrator.identityLoginBucket.deleteMany();
  const person = await volunteer();
  const invalid = `Z9${randomBytes(16).toString('hex')}`;
  for (let i = 0; i < 5; i++) expect((await login(person.email, invalid)).status).toBe(401);
  expect((await login(person.email)).status).toBe(429);
  await migrator.identityLoginBucket.updateMany({ where: { kind: 'ACCOUNT' }, data: { expiresAt: new Date(Date.now() - 1) } });
  await sessionFor(person.email);
  await migrator.identityLoginBucket.updateMany({ where: { kind: 'IP' }, data: { attempts: 49 } });
  expect((await login(person.email)).status).toBe(200);
  expect((await login(syntheticAddress())).status).toBe(429);
});

test('OpenAPI documents the identity operations and session security', async () => {
  const response = await fetch(`${url}/openapi.json`);
  expect(response.status).toBe(200);
  const document = await response.json();
  expect(document.paths['/identity/register'].post.requestBody).toBeDefined();
  const registration = document.paths['/identity/register'].post.requestBody.content['application/json'].schema;
  expect(registration.required).toEqual(['email']);
  expect(registration.properties).not.toHaveProperty('password');
  const verification = document.paths['/identity/email/verify'].post.requestBody.content['application/json'].schema;
  expect(verification.required).toEqual(['token', 'password']);
  expect(verification.properties.password.minLength).toBe(10);
  expect(document.paths['/identity/profile'].patch.security).toContainEqual({ session: [] });
  expect(document.paths['/identity/password/reset'].post.responses['204']).toBeDefined();
});

test('OpenAPI documents logout with optional session and required CSRF', async () => {
  const response = await fetch(`${url}/openapi.json`);
  expect(response.status).toBe(200);
  const document = await response.json();
  const logout = document.paths['/identity/logout'].post;
  expect(logout.security).toEqual(expect.arrayContaining([{ session: [] }, {}]));
  expect(logout.parameters).toContainEqual(expect.objectContaining({ name: 'X-CSRF-Token', in: 'header', required: true }));
  expect(logout.responses['204'].headers['Set-Cookie']).toBeDefined();
  expect(logout.responses['403']).toBeDefined();
  expect(logout.responses['401']).toBeUndefined();
});

test('Resend adapter sends the transactional payload with the stable idempotency key', async () => {
  expect((await fetch(`${url}/identity/csrf`)).status).toBe(200);
  const { ResendIdentityDelivery } = require('../dist/identity/identity-mail');
  const apiKey = randomBytes(24).toString('hex');
  const sender = syntheticAddress();
  const idempotencyKey = randomUUID();
  const mail = { to: syntheticAddress(), subject: 'Fixture', text: 'Fixture', idempotencyKey };
  const transport = new ResendIdentityDelivery(apiKey, sender);
  const fetchStub = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 202 }));
  try {
    await transport.send(mail);
    expect(fetchStub.mock.calls.length).toBe(1);
    const [target, options] = fetchStub.mock.calls[0];
    expect(target).toBe('https://api.resend.com/emails');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization === `Bearer ${apiKey}`).toBe(true);
    expect(options.headers['Idempotency-Key'] === idempotencyKey).toBe(true);
    expect(options.body === JSON.stringify({
      from: sender, to: [mail.to], subject: mail.subject, text: mail.text,
    })).toBe(true);
  } finally {
    fetchStub.mockRestore();
  }
});
