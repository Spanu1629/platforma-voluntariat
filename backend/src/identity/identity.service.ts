import {
  BadRequestException, ConflictException, ForbiddenException, HttpException,
  Injectable, NotFoundException, UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { verify } from 'argon2';
import { Prisma, type IdentityAccount, type IdentityChallengePurpose } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import {
  emailAddress, equalToken, hashPassword, HOUR, MINUTE, ORGANIZATION, uuid,
} from './identity-input';
import { challengeSignature } from './identity-mail';
import { IdentitySettings } from './identity-settings';
import { accountActive, audit, enqueueChallenge, lockAccount, lockAdministration } from './identity-store';

const LOGIN_WINDOW = 15 * MINUTE;
const SESSION_AGE = 7 * 24 * HOUR;
const SESSION_FORMAT = /^[a-zA-Z0-9_-]{43}$/;

function digest(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function identityView(account: IdentityAccount) {
  return { id: account.id, email: account.email, role: account.role, approved: account.approvedAt !== null };
}

function limitReached(): HttpException {
  return new HttpException('Too many authentication attempts.', 429);
}

function invalidLink(): BadRequestException {
  return new BadRequestException('Invalid or expired link.');
}

const staffSelect = {
  id: true, email: true, role: true, emailVerifiedAt: true, activatedAt: true,
  disabledAt: true, canApprove: true,
} as const;

@Injectable()
export class IdentityService {
  private dummyHash?: Promise<string>;

  constructor(private readonly db: PrismaService, private readonly settings: IdentitySettings) {}

  async register(address: unknown, locale: string): Promise<void> {
    const email = emailAddress(address);
    try {
      await this.db.$transaction(async (tx) => {
        const { id } = await tx.identityAccount.create({
          data: { email, locale, role: 'VOLUNTEER', organizationId: ORGANIZATION },
          select: { id: true },
        });
        await enqueueChallenge(tx, id, 'VERIFY_EMAIL', new Date());
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      // Preserve the same response for an address that already exists.
    }
  }

  async requestLink(email: string, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD'): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const target = await tx.identityAccount.findUnique({ where: { email }, select: { id: true } });
      if (!target) return;
      await lockAccount(tx, target.id);
      const account = await tx.identityAccount.findUniqueOrThrow({ where: { id: target.id } });
      if (account.disabledAt) return;
      if (purpose === 'VERIFY_EMAIL' && !account.emailVerifiedAt) {
        const action = account.role === 'VOLUNTEER' ? 'VERIFY_EMAIL' : 'ACTIVATE_STAFF';
        await enqueueChallenge(tx, target.id, action, new Date());
      } else if (purpose === 'RESET_PASSWORD' && accountActive(account)) {
        await enqueueChallenge(tx, target.id, purpose, new Date());
      }
    });
  }

  async consumeLink(purpose: IdentityChallengePurpose, token: unknown, password: unknown): Promise<void> {
    if (typeof token !== 'string' || token.length !== 80) throw invalidLink();
    const [id, signature] = token.split('.');
    if (!uuid(id) || !SESSION_FORMAT.test(signature ?? '') ||
      !equalToken(signature, challengeSignature(this.settings, purpose, id))) throw invalidLink();
    const challenge = await this.db.identityChallenge.findUnique({ where: { id } });
    if (!challenge || challenge.purpose !== purpose || challenge.consumedAt || challenge.expiresAt <= new Date()) {
      throw invalidLink();
    }
    const passwordHash = await hashPassword(password);
    await this.db.$transaction(async (tx) => {
      await lockAccount(tx, challenge.accountId);
      const account = await tx.identityAccount.findUniqueOrThrow({ where: { id: challenge.accountId } });
      const now = new Date();
      const eligible = !account.disabledAt && (purpose === 'RESET_PASSWORD'
        ? accountActive(account)
        : !account.emailVerifiedAt && (purpose === 'VERIFY_EMAIL' ? account.role === 'VOLUNTEER' : account.role !== 'VOLUNTEER'));
      if (!eligible) throw invalidLink();
      const consumed = await tx.identityChallenge.updateMany({
        where: { id, purpose, consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now },
      });
      if (!consumed.count) throw invalidLink();

      await tx.identityAccount.update({
        where: { id: account.id },
        data: purpose === 'RESET_PASSWORD' ? { passwordHash } : { passwordHash, emailVerifiedAt: now, activatedAt: now },
      });
      if (purpose === 'RESET_PASSWORD') await tx.identitySession.deleteMany({ where: { accountId: account.id } });
    });
  }

  async login(email: string, password: string, ip: string) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LOGIN_WINDOW);
    const ipKey = this.settings.signature('login', 'IP:' + ip);
    const [ipBucket] = await this.db.$queryRaw<Array<{ attempts: number }>>`
      INSERT INTO "IdentityLoginBucket" ("key", "kind", "attempts", "expiresAt")
      VALUES (${ipKey}, 'IP', 1, ${expiresAt})
      ON CONFLICT ("key") DO UPDATE SET
        "attempts" = CASE WHEN "IdentityLoginBucket"."expiresAt" <= ${now} THEN 1
          ELSE LEAST("IdentityLoginBucket"."attempts", 50) + 1 END,
        "expiresAt" = CASE WHEN "IdentityLoginBucket"."expiresAt" <= ${now} THEN ${expiresAt}
          ELSE "IdentityLoginBucket"."expiresAt" END
      RETURNING "attempts"
    `;
    if (ipBucket.attempts > 50) throw limitReached();

    const key = this.settings.signature('login', 'ACCOUNT:' + email);
    this.dummyHash ??= hashPassword('A1' + randomBytes(32).toString('hex'));
    const dummy = await this.dummyHash;
    const result = await this.db.$transaction(async (tx) => {
      // The upsert locks the account's bucket until the password result is recorded.
      const [bucket] = await tx.$queryRaw<Array<{ attempts: number; expiresAt: Date; blockedUntil: Date | null }>>`
        INSERT INTO "IdentityLoginBucket" ("key", "kind", "expiresAt")
        VALUES (${key}, 'ACCOUNT', ${expiresAt})
        ON CONFLICT ("key") DO UPDATE SET "key" = EXCLUDED."key"
        RETURNING "attempts", "expiresAt", "blockedUntil"
      `;
      const attemptAt = new Date();
      const live = bucket.expiresAt > attemptAt;
      if (live && bucket.blockedUntil && bucket.blockedUntil > attemptAt) return { state: 'limited' } as const;
      const snapshot = await tx.identityAccount.findUnique({ where: { email } });
      const valid = await verify(snapshot?.passwordHash ?? dummy, password);
      if (snapshot && valid && accountActive(snapshot)) {
        await lockAccount(tx, snapshot.id);
        const account = await tx.identityAccount.findUniqueOrThrow({ where: { id: snapshot.id } });
        // A reset that wins the account lock invalidates the verified credential.
        if (account.passwordHash === snapshot.passwordHash && accountActive(account)) {
          const token = randomBytes(32).toString('base64url');
          const issuedAt = new Date();
          await tx.identitySession.create({ data: {
            digest: digest(token), accountId: account.id, createdAt: issuedAt, lastSeenAt: issuedAt,
          } });
          await tx.identityLoginBucket.delete({ where: { key } });
          return { state: 'authenticated', token, account: identityView(account) } as const;
        }
      }

      const attempts = (live ? bucket.attempts : 0) + 1;
      const delay = attempts < 5 ? 0 : Math.min(2 ** Math.min(attempts - 5, 5) * 2_000, 60_000);
      await tx.identityLoginBucket.update({
        where: { key },
        data: { attempts, expiresAt: live ? bucket.expiresAt : new Date(attemptAt.getTime() + LOGIN_WINDOW),
          blockedUntil: delay ? new Date(attemptAt.getTime() + delay) : null },
      });
      return { state: 'rejected' } as const;
    });
    if (result.state === 'limited') throw limitReached();
    if (result.state !== 'authenticated') throw new UnauthorizedException('Invalid credentials.');
    return result;
  }

  async principal(tx: Prisma.TransactionClient, token: string | undefined) {
    if (!token || !SESSION_FORMAT.test(token)) throw new UnauthorizedException();
    const key = digest(token);
    const session = await tx.identitySession.findUnique({ where: { digest: key }, select: { accountId: true } });
    if (!session) throw new UnauthorizedException();
    await lockAccount(tx, session.accountId);
    const account = await tx.identityAccount.findUniqueOrThrow({ where: { id: session.accountId } });
    if (!accountActive(account)) throw new UnauthorizedException();
    const now = new Date();
    const touched = await tx.identitySession.updateMany({
      where: { digest: key, createdAt: { gt: new Date(now.getTime() - SESSION_AGE) },
        lastSeenAt: { gt: new Date(now.getTime() - 24 * HOUR) } },
      data: { lastSeenAt: now },
    });
    if (!touched.count) throw new UnauthorizedException();
    return account;
  }

  async logout(token: string | undefined): Promise<void> {
    if (token && SESSION_FORMAT.test(token)) await this.db.identitySession.deleteMany({ where: { digest: digest(token) } });
  }

  async profile(token: string | undefined, changes?: {
    firstName?: string | null; lastName?: string | null; phone?: string | null;
    locality?: string | null; birthDate?: Date | null;
  }) {
    return this.db.$transaction(async (tx) => {
      const account = await this.principal(tx, token);
      const where = { accountId: account.id };
      if (changes && account.role !== 'VOLUNTEER') throw new ForbiddenException();
      const previous = await tx.identityProfile.findUnique({ where });
      const row = changes
        ? await tx.identityProfile.upsert({ where, create: { ...where, ...changes }, update: changes })
        : previous;
      if (changes && (row?.firstName !== (previous?.firstName ?? null) ||
        row?.lastName !== (previous?.lastName ?? null) ||
        (row?.birthDate?.getTime() ?? null) !== (previous?.birthDate?.getTime() ?? null))) {
        const now = new Date();
        await audit(tx, account.id, account.id, 'IDENTITY_PROFILE_FIELDS_CHANGED', now);
        const invalidated = await tx.volunteerIdentityVerification.updateMany({
          where: { accountId: account.id, result: 'VERIFIED', invalidatedAt: null },
          data: { invalidatedAt: now },
        });
        if (invalidated.count) {
          await audit(tx, account.id, account.id, 'IDENTITY_VERIFICATION_INVALIDATED', now);
          await tx.eligibilityReview.createMany({ data: {
            subjectId: account.id, reason: 'IDENTITY_INVALIDATED',
          } });
        }
      }
      return { ...identityView(account), firstName: row?.firstName ?? null, lastName: row?.lastName ?? null,
        birthDate: row?.birthDate?.toISOString().slice(0, 10) ?? null, phone: row?.phone ?? null,
        locality: row?.locality ?? null };
    });
  }

  async pendingAccounts(token: string | undefined) {
    return this.db.$transaction(async (tx) => {
      const actor = await this.principal(tx, token);
      this.requireApprovalPermission(actor);
      return tx.identityAccount.findMany({
        where: { organizationId: actor.organizationId, role: 'VOLUNTEER', disabledAt: null,
          emailVerifiedAt: { not: null }, approvedAt: null },
        select: { id: true, email: true },
        orderBy: { id: 'asc' },
        take: 100,
      });
    });
  }

  async listStaff(token: string | undefined) {
    return this.db.$transaction(async (tx) => {
      const actor = await this.principal(tx, token);
      this.requireAdmin(actor);
      return tx.identityAccount.findMany({
        where: { organizationId: actor.organizationId, role: { not: 'VOLUNTEER' } },
        select: staffSelect,
        orderBy: { id: 'asc' },
      });
    });
  }

  async createStaff(token: string | undefined, email: string, role: 'ADMIN' | 'COORDINATOR', locale: string) {
    try {
      return await this.db.$transaction(async (tx) => {
        await lockAdministration(tx);
        const actor = await this.principal(tx, token);
        this.requireAdmin(actor);
        const now = new Date();
        const account = await tx.identityAccount.create({
          data: { email, role, locale, organizationId: actor.organizationId }, select: staffSelect,
        });
        await enqueueChallenge(tx, account.id, 'ACTIVATE_STAFF', now);
        await audit(tx, actor.id, account.id, 'STAFF_CREATED', now);
        return account;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An account already uses this email.');
      }
      throw error;
    }
  }

  async changeStaff(token: string | undefined, id: string, change: { disabled: boolean } | { role: 'ADMIN' | 'COORDINATOR' }) {
    await this.db.$transaction(async (tx) => {
      await lockAdministration(tx);
      const actor = await this.principal(tx, token);
      this.requireAdmin(actor);
      await lockAccount(tx, id);
      const target = await tx.identityAccount.findFirst({
        where: { id, organizationId: actor.organizationId, role: { not: 'VOLUNTEER' } },
      });
      if (!target) throw new NotFoundException();

      const now = new Date();
      const roleChanged = 'role' in change && change.role !== target.role;
      const statusChanged = 'disabled' in change && change.disabled !== (target.disabledAt !== null);
      if (!roleChanged && !statusChanged) return;
      const losesAdmin = roleChanged || ('disabled' in change && change.disabled);
      if (target.role === 'ADMIN' && accountActive(target) && losesAdmin &&
        await tx.identityAccount.count({
          where: { organizationId: actor.organizationId, role: 'ADMIN', disabledAt: null,
            activatedAt: { not: null }, emailVerifiedAt: { not: null } },
        }) <= 1) throw new ConflictException('The last active administrator must remain.');

      await tx.identityAccount.update({
        where: { id },
        data: 'role' in change ? { role: change.role, canApprove: false } : { disabledAt: change.disabled ? now : null },
      });
      await tx.identitySession.deleteMany({ where: { accountId: id } });
      if ('role' in change) {
        await audit(tx, actor.id, id, change.role === 'ADMIN' ? 'ADMIN_ROLE_GRANTED' : 'ADMIN_ROLE_REVOKED', now);
      } else {
        await audit(tx, actor.id, id, change.disabled ? 'STAFF_DISABLED' : 'STAFF_ENABLED', now);
      }
      if (roleChanged && target.canApprove) await audit(tx, actor.id, id, 'DELEGATION_REVOKED', now);
      if (roleChanged && (await tx.trainingPermission.deleteMany({ where: { accountId: id } })).count) {
        await audit(tx, actor.id, id, 'TRAINING_PERMISSION_REVOKED', now);
      }
    });
  }

  async setDelegation(token: string | undefined, id: string, granted: boolean): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await lockAdministration(tx);
      const actor = await this.principal(tx, token);
      this.requireAdmin(actor);
      const result = await tx.identityAccount.updateMany({
        where: { id, organizationId: actor.organizationId, role: 'COORDINATOR', canApprove: !granted },
        data: { canApprove: granted },
      });
      if (result.count) await audit(tx, actor.id, id, granted ? 'DELEGATION_GRANTED' : 'DELEGATION_REVOKED', new Date());
      else if (!await tx.identityAccount.findFirst({
        where: { id, organizationId: actor.organizationId, role: 'COORDINATOR' }, select: { id: true },
      })) throw new NotFoundException();
    });
  }

  async approve(token: string | undefined, id: string): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await lockAdministration(tx);
      const actor = await this.principal(tx, token);
      this.requireApprovalPermission(actor);
      await lockAccount(tx, id);
      const target = await tx.identityAccount.findFirst({
        where: { id, organizationId: actor.organizationId, role: 'VOLUNTEER' },
      });
      if (!target) throw new NotFoundException();
      if (!accountActive(target)) throw new ConflictException('The email must be verified and the account active.');
      if (target.approvedAt) return;
      const now = new Date();
      await tx.identityAccount.update({ where: { id }, data: { approvedAt: now } });
      await audit(tx, actor.id, id, 'ACCOUNT_APPROVED', now);
    });
  }

  private requireAdmin(account: IdentityAccount): void {
    if (account.role !== 'ADMIN') throw new ForbiddenException();
  }

  private requireApprovalPermission(account: IdentityAccount): void {
    if (account.role !== 'ADMIN' && !(account.role === 'COORDINATOR' && account.canApprove)) {
      throw new ForbiddenException();
    }
  }
}
