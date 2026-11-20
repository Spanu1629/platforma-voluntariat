const { createHash, randomBytes, randomUUID } = require('node:crypto');
const { PrismaPg } = require('@prisma/adapter-pg');
const { NestFactory } = require('@nestjs/core');
const { PrismaClient } = require('../dist/generated/prisma/client');
const { AppModule } = require('../dist/app.module');

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

async function startApp() {
  app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
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
  const response = await request('/register', { method: 'POST', body: { email, password, locale } });
  expect(response.status).toBe(202);
  return email;
}

async function verify(email) {
  const { token } = await deliveredTo(email);
  expect((await request('/email/verify', { method: 'POST', body: { token } })).status).toBe(204);
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
  expect(row.passwordHash).toMatch(/^\$argon2id\$/);
  const { token, message, path } = await deliveredTo(email);
  expect(path).toBe('/email/verify');
  expect(message.subject).toMatch(/verify/i);
  expect((await request(path)).status).toBe(200);
  const results = await Promise.all([1, 2].map(() => request(path, { method: 'POST', body: { token } })));
  expect(results.map((result) => result.status).sort()).toEqual([204, 400]);
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

test('password policy and CSRF cover anonymous and authenticated mutations', async () => {
  const email = syntheticAddress();
  for (const invalid of ['A1' + 'a'.repeat(7), 'a1' + 'a'.repeat(8), 'Aa'.repeat(5), 'A1' + 'a'.repeat(127)]) {
    expect((await request('/register', { method: 'POST', body: { email, password: invalid } })).status).toBe(400);
  }
  expect((await request('/register', { method: 'POST', body: { email, password }, protection: false })).status).toBe(403);
  expect((await request('/register', { method: 'POST', body: { email, password }, from: 'https://other.example.invalid' })).status).toBe(403);
  expect((await request('/register', { method: 'POST', body: { email, password: 'A1' + 'a'.repeat(126) } })).status).toBe(202);
  const person = await volunteer();
  expect((await request('/profile', { method: 'PATCH', session: person.session, body: { firstName: 'Fixture' }, protection: false })).status).toBe(403);
});

test('sessions expire on inactivity or maximum age and reset revokes all sessions', async () => {
  const person = await volunteer();
  const second = await sessionFor(person.email);
  const id = (cookie) => createHash('sha256').update(cookie.split(';')[0].slice(sessionCookie.length + 1)).digest('hex');
  await migrator.identitySession.update({ where: { digest: id(person.session) }, data: { lastSeenAt: new Date(Date.now() - 24 * hour) } });
  await migrator.identitySession.update({ where: { digest: id(second) }, data: { createdAt: new Date(Date.now() - 7 * 24 * hour) } });
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
  expect((await request('/email/verify', { method: 'POST', body: { token } })).status).toBe(400);
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
  expect(delivery.messages).toEqual([attempted]);
  expect(await worker.deliverNext(new Date(Date.now() + minute))).toBe(false);
  expect((await migrator.identityMailJob.findUniqueOrThrow({ where: { id: job.id } })).state).toBe('SENT');
  expect(email).not.toBe(retryEmail);
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
  expect(document.paths['/identity/profile'].patch.security).toContainEqual({ session: [] });
  expect(document.paths['/identity/password/reset'].post.responses['204']).toBeDefined();
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
    expect(fetchStub).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: `Bearer ${apiKey}`, 'Idempotency-Key': idempotencyKey }),
      body: JSON.stringify({ from: sender, to: [mail.to], subject: mail.subject, text: mail.text }),
    }));
  } finally {
    fetchStub.mockRestore();
  }
});
