import {
  ArgumentsHost, CanActivate, Catch, ExceptionFilter, ExecutionContext,
  ForbiddenException, HttpException, Injectable, Logger, ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { equalToken } from './identity-input';
import { IdentitySettings } from './identity-settings';

export const SESSION_COOKIE = '__Host-voluntrack-session';
export const CSRF_COOKIE = '__Host-voluntrack-csrf';
export const cookieOptions = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' } as const;

export function cookie(request: Request, name: string): string | undefined {
  const entries = request.headers.cookie?.split(';').map((entry) => entry.trim())
    .filter((entry) => entry.startsWith(name + '='));
  return entries?.length === 1 ? entries[0].slice(name.length + 1) : undefined;
}

@Injectable()
export class IdentityCsrf implements CanActivate {
  constructor(private readonly settings: IdentitySettings) {}

  issue(request: Request, response: Response) {
    const existing = cookie(request, CSRF_COOKIE);
    if (existing && this.valid(existing)) return { token: existing };
    const nonce = randomBytes(32).toString('base64url');
    const token = nonce + '.' + this.settings.signature('csrf', nonce);
    response.cookie(CSRF_COOKIE, token, cookieOptions);
    return { token };
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!this.settings.origin) throw new ServiceUnavailableException('Identity is not configured.');
    if (request.method === 'GET' || request.method === 'HEAD') return true;
    const header = request.get('X-CSRF-Token');
    const proof = cookie(request, CSRF_COOKIE);
    if (request.get('Origin') !== this.settings.origin || !header || !proof ||
      header.length !== 87 || !equalToken(header, proof) || !this.valid(header)) {
      throw new ForbiddenException('Invalid request origin or CSRF token.');
    }
    return true;
  }

  private valid(token: string): boolean {
    if (!/^[a-zA-Z0-9_-]{43}\.[a-zA-Z0-9_-]{43}$/.test(token)) return false;
    const [nonce, signature] = token.split('.');
    return equalToken(signature, this.settings.signature('csrf', nonce));
  }
}

@Catch()
export class IdentityExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(IdentityExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const status = exception.getStatus();
      response.status(status).json(typeof body === 'string' ? { statusCode: status, message: body } : body);
      return;
    }
    this.logger.error('Unexpected identity API failure.');
    response.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
}
