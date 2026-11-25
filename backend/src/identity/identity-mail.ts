import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { IdentityChallengePurpose } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { MINUTE } from './identity-input';
import { IdentitySettings } from './identity-settings';

const templates = {
  VERIFY_EMAIL: {
    path: '/identity/email/verify',
    ro: 'Verifică adresa de email VolunTrack',
    en: 'Verify your VolunTrack email address',
  },
  RESET_PASSWORD: {
    path: '/identity/password/reset',
    ro: 'Resetează parola VolunTrack',
    en: 'Reset your VolunTrack password',
  },
  ACTIVATE_STAFF: {
    path: '/identity/staff/activate',
    ro: 'Activează contul VolunTrack',
    en: 'Activate your VolunTrack account',
  },
};

type Delivery = {
  to: string;
  subject: string;
  text: string;
  link: string;
  idempotencyKey: string;
};

export function challengeSignature(settings: IdentitySettings, purpose: IdentityChallengePurpose, id: string) {
  return settings.signature('challenge', purpose + ':' + id);
}

@Injectable()
export class SimulatedIdentityDelivery {
  readonly messages: Delivery[] = [];

  async send(message: Delivery): Promise<void> {
    this.messages.push(message);
  }
}

class DeliveryError extends Error {
  constructor(readonly retryable: boolean) {
    super('Identity email delivery failed.');
  }
}

export class ResendIdentityDelivery {
  constructor(private readonly apiKey: string, private readonly from: string) {}

  async send(message: Delivery): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.apiKey,
        'Content-Type': 'application/json',
        'Idempotency-Key': message.idempotencyKey,
      },
      body: JSON.stringify({ from: this.from, to: [message.to], subject: message.subject, text: message.text }),
      signal: AbortSignal.timeout(8_000),
    });
    await response.body?.cancel().catch(() => undefined);
    if (!response.ok) {
      throw new DeliveryError(response.status === 409 || response.status === 429 || response.status >= 500);
    }
  }
}

@Injectable()
export class IdentityMailWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IdentityMailWorker.name);
  private readonly resend?: ResendIdentityDelivery;
  private timer?: NodeJS.Timeout;
  private active?: Promise<void>;
  private nextSweep = 0;

  constructor(
    private readonly db: PrismaService,
    private readonly settings: IdentitySettings,
    private readonly simulated: SimulatedIdentityDelivery,
  ) {
    if (settings.transport === 'resend') {
      const { RESEND_API_KEY, IDENTITY_MAIL_FROM } = process.env;
      if (!RESEND_API_KEY?.trim() || !IDENTITY_MAIL_FROM?.trim()) {
        throw new Error('Resend requires RESEND_API_KEY and IDENTITY_MAIL_FROM.');
      }
      this.resend = new ResendIdentityDelivery(RESEND_API_KEY, IDENTITY_MAIL_FROM);
    }
  }

  onModuleInit(): void {
    if (!this.settings.origin || process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      if (this.active) return;
      this.active = this.tick().catch(() => {
        this.logger.warn('Identity background processing failed and will retry.');
      }).finally(() => { this.active = undefined; });
    }, 2_000);
    this.timer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    clearInterval(this.timer);
    await this.active;
  }

  private async tick(): Promise<void> {
    const now = new Date();
    if (this.nextSweep <= now.getTime()) {
      await this.db.identityLoginBucket.deleteMany({ where: { expiresAt: { lte: now } } });
      this.nextSweep = now.getTime() + MINUTE;
    }
    if (this.resend) await this.deliverNext(now);
  }

  async deliverNext(now = new Date()): Promise<boolean> {
    const sender = this.resend ?? (this.settings.transport === 'simulated' ? this.simulated : undefined);
    if (!sender || !this.settings.origin) return false;

    const available = {
      state: 'PENDING' as const,
      availableAt: { lte: now },
      OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }],
    };
    const job = await this.db.identityMailJob.findFirst({
      where: available, orderBy: [{ availableAt: 'asc' }, { id: 'asc' }],
      include: { challenge: { include: { account: true } } },
    });
    if (!job) return false;

    const current = { ...available, id: job.id, attempts: job.attempts };
    const { challenge } = job;
    if (challenge.consumedAt || challenge.account.disabledAt || challenge.expiresAt <= now) {
      // Beyond the link lifetime, an ambiguous prior send needs manual review.
      const state = job.attempts && challenge.expiresAt <= now ? 'REVIEW' : 'EXPIRED';
      await this.db.identityMailJob.updateMany({ where: current, data: { state, leaseUntil: null } });
      return true;
    }

    const attempt = job.attempts + 1;
    const claim = await this.db.identityMailJob.updateMany({
      where: current,
      data: { attempts: attempt, leaseUntil: new Date(now.getTime() + 30_000) },
    });
    if (!claim.count) return true;

    const claimed = { id: job.id, attempts: attempt, state: 'PENDING' as const };
    const template = templates[challenge.purpose];
    const link = new URL(template.path, this.settings.origin);
    link.hash = 'token=' + challenge.id + '.' + challengeSignature(this.settings, challenge.purpose, challenge.id);
    const url = link.toString();
    const subject = template[challenge.account.locale === 'en' ? 'en' : 'ro'];

    try {
      await sender.send({ to: challenge.account.email, subject, text: subject + '\n\n' + url, link: url,
        idempotencyKey: 'voluntrack-identity/' + job.id });
    } catch (error) {
      const retryable = !(error instanceof DeliveryError) || error.retryable;
      const delay = Math.min(2 ** Math.min(attempt - 1, 6) * 15_000, 10 * MINUTE);
      const retryAt = new Date(Math.min(now.getTime() + delay, challenge.expiresAt.getTime()));
      await this.db.identityMailJob.updateMany({
        where: claimed,
        data: retryable ? { availableAt: retryAt, leaseUntil: null } : { state: 'REVIEW', leaseUntil: null },
      });
      return true;
    }

    await this.db.identityMailJob.updateMany({ where: claimed, data: { state: 'SENT', leaseUntil: null } });
    return true;
  }
}
