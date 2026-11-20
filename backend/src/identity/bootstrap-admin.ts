import { type PrismaClient } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { emailAddress, hashPassword, ORGANIZATION } from './identity-input';
import { audit, lockAdministration } from './identity-store';

export async function bootstrapAdministrator(db: PrismaClient, address: string, secret: string) {
  const email = emailAddress(address);
  const passwordHash = await hashPassword(secret);
  return db.$transaction(async (tx) => {
    await lockAdministration(tx);
    if (await tx.identityAccount.count({ where: { organizationId: ORGANIZATION, role: 'ADMIN' } })) {
      throw new Error('An administrator has already been initialized.');
    }
    const now = new Date();
    const account = await tx.identityAccount.create({
      data: { email, passwordHash, role: 'ADMIN', locale: 'ro', organizationId: ORGANIZATION,
        activatedAt: now, emailVerifiedAt: now },
      select: { id: true, role: true },
    });
    await audit(tx, account.id, account.id, 'ADMIN_BOOTSTRAPPED', now);
    return account;
  });
}

async function run(): Promise<void> {
  const db = new PrismaService();
  try {
    const email = process.env.IDENTITY_ADMIN_EMAIL;
    if (!email) throw new Error();
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of process.stdin) {
      bytes += chunk.length;
      if (bytes > 1024) throw new Error();
      chunks.push(chunk);
    }
    const secret = Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
    await bootstrapAdministrator(db, email, secret);
    process.stdout.write('Administrator initialized.\n');
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  void run().catch(() => {
    process.stderr.write('Administrator initialization failed. Verify the runtime inputs and existing administrators.\n');
    process.exitCode = 1;
  });
}
