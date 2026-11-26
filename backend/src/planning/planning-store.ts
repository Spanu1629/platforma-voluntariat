import { ConflictException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';

export async function lockEvent(tx: Prisma.TransactionClient, eventId: string, organizationId: string) {
  const locked = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "PlanningEvent" WHERE id = ${eventId}::uuid AND "organizationId" = ${organizationId}
    FOR UPDATE
  `;
  if (!locked.length) throw new NotFoundException();
  return tx.planningEvent.findUniqueOrThrow({ where: { id: eventId } });
}

export async function breakPolicy(tx: Prisma.TransactionClient, organizationId: string) {
  const policy = await tx.planningPolicy.findUnique({ where: { organizationId } });
  if (!policy) throw new ConflictException('Planning policy is unavailable.');
  return policy;
}

export async function auditPlanning(
  tx: Prisma.TransactionClient, eventId: string, actorId: string, targetId: string, action: string,
) {
  await tx.planningAudit.createMany({ data: { eventId, actorId, targetId, action } });
}
