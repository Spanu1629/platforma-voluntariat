import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHmac } from 'node:crypto';

@Injectable()
export class IdentitySettings {
  readonly origin?: string;
  readonly transport: 'disabled' | 'simulated' | 'resend';
  private readonly secret?: Buffer;

  constructor() {
    const { IDENTITY_MAIL_TRANSPORT = 'disabled' } = process.env;
    const publicUrl = process.env.IDENTITY_PUBLIC_URL?.trim();
    const secret = process.env.IDENTITY_SECRET?.trim();
    if (!['disabled', 'simulated', 'resend'].includes(IDENTITY_MAIL_TRANSPORT)) {
      throw new Error('Invalid IDENTITY_MAIL_TRANSPORT.');
    }
    this.transport = IDENTITY_MAIL_TRANSPORT as IdentitySettings['transport'];
    if (this.transport === 'resend' && (process.env.CI === 'true' || process.env.NODE_ENV === 'test')) {
      throw new Error('Real email delivery is unavailable in automated tests.');
    }
    if (!publicUrl && !secret && this.transport === 'disabled') {
      return;
    }
    try {
      const url = new URL(publicUrl ?? '');
      if (
        url.protocol !== 'https:' || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash
      ) {
        throw new Error();
      }
      this.origin = url.origin;
    } catch {
      throw new Error('IDENTITY_PUBLIC_URL must be a valid HTTPS origin.');
    }
    if (!secret || !/^[a-f\d]{64}$/i.test(secret)) {
      throw new Error('IDENTITY_SECRET must be a 32-byte hex secret.');
    }
    this.secret = Buffer.from(secret, 'hex');
  }

  signature(context: 'csrf' | 'challenge' | 'login', value: string): string {
    if (!this.secret) throw new ServiceUnavailableException('Identity is not configured.');
    return createHmac('sha256', this.secret).update(context + ':' + value).digest('base64url');
  }
}
