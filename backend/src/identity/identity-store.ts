import { Prisma, type IdentityAccount, type IdentityChallengePurpose, type IdentityRole } from '../generated/prisma/client';
import { HOUR, MINUTE } from './identity-input';

export function accountActive(account: IdentityAccount): boolean {
  return account.disabledAt === null && account.activatedAt !== null && account.emailVerifiedAt !== null;
}

// A single-organization advisory lock serializes privileged account and delegation changes.
export async function lockAdministration(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$queryRaw`SELECT 1::int AS locked FROM pg_advisory_xact_lock(19820921, 1)`;
}

export async function lockAccount(tx: Prisma.TransactionClient, id: string): Promise<void> {
  await tx.$queryRaw`SELECT 1::int AS locked FROM "IdentityAccount" WHERE id = ${id}::uuid FOR UPDATE`;
}

export async function lockAccountInRole(
  tx: Prisma.TransactionClient, id: string, organizationId: string, role: IdentityRole,
): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "IdentityAccount"
    WHERE id = ${id}::uuid AND "organizationId" = ${organizationId} AND role = ${role}::"IdentityRole"
    FOR UPDATE
  `;
  return rows.length > 0;
}

export async function enqueueChallenge(
  tx: Prisma.TransactionClient,
  accountId: string,
  purpose: IdentityChallengePurpose,
  now: Date,
): Promise<void> {
  const existing = await tx.identityChallenge.findFirst({
    where: { accountId, purpose, consumedAt: null, expiresAt: { gt: now } },
    select: { id: true },
  });
  if (existing) return;

  const duration = purpose === 'RESET_PASSWORD' ? 30 * MINUTE : 24 * HOUR;
  await tx.identityChallenge.create({
    data: {
      accountId, purpose, createdAt: now, expiresAt: new Date(now.getTime() + duration),
      mail: { create: { availableAt: now } },
    },
  });
}

export async function audit(
  tx: Prisma.TransactionClient,
  actorId: string,
  targetId: string,
  action: string,
  occurredAt: Date,
): Promise<void> {
  await tx.identityAudit.createMany({ data: { actorId, targetId, action, occurredAt } });
}
