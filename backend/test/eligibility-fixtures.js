const { createHash, randomBytes, randomUUID } = require('node:crypto');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/generated/prisma/client');
const { createApplication } = require('../dist/main');

const origin = 'https://eligibility.example.invalid';

function integration() {
  let app;
  let db;
  let url;

  beforeAll(async () => {
    const { DATABASE_URL, TEST_APP_URL } = process.env;
    if (!DATABASE_URL || !TEST_APP_URL) throw new Error('Run backend/test/run-integration.sh.');
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });
    process.env.DATABASE_URL = TEST_APP_URL;
    process.env.IDENTITY_PUBLIC_URL = origin;
    process.env.IDENTITY_SECRET = randomBytes(32).toString('hex');
    process.env.IDENTITY_MAIL_TRANSPORT = 'disabled';
    app = await createApplication({ logger: false, abortOnError: false });
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
    await db?.$disconnect();
  });

  async function account(role, fields = {}) {
    const now = new Date();
    const row = await db.identityAccount.create({ data: {
      email: `fixture-${randomUUID()}@example.invalid`, organizationId: 'voluntrack',
      locale: 'ro', role, activatedAt: now, emailVerifiedAt: now, ...fields,
    } });
    const raw = randomBytes(32).toString('base64url');
    await db.identitySession.create({ data: {
      digest: createHash('sha256').update(raw).digest('hex'),
      createdAt: now, lastSeenAt: now, accountId: row.id,
    } });
    return { id: row.id, raw, cookie: `__Host-voluntrack-session=${raw}` };
  }

  async function request(path, { method = 'GET', actor, body, csrf = true } = {}) {
    const jar = actor ? [actor.cookie] : [];
    const headers = { Origin: origin };
    if (method !== 'GET' && csrf) {
      const proof = await fetch(`${url}/identity/csrf`);
      expect(proof.status).toBe(200);
      jar.push(proof.headers.getSetCookie()[0].split(';')[0]);
      headers['X-CSRF-Token'] = (await proof.json()).token;
    }
    if (jar.length) headers.Cookie = jar.join('; ');
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(url + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  }

  async function json(path, options, status = 200) {
    const response = await request(path, options);
    expect(response.status).toBe(status);
    return response.json();
  }

  return { get db() { return db; }, get app() { return app; }, account, request, json };
}

module.exports = { integration };
