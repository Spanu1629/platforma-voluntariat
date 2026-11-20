import 'reflect-metadata';
import type { NestApplicationOptions } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { isIP } from 'node:net';
import { AppModule } from './app.module';
import { SESSION_COOKIE } from './identity/identity-http';

function trustedProxies(): string[] {
  const value = process.env.IDENTITY_TRUSTED_PROXIES?.trim();
  if (!value) return [];
  const proxies = value.split(',').map((entry) => entry.trim());
  for (const proxy of proxies) {
    const [address, prefix, extra] = proxy.split('/');
    const family = isIP(address);
    const validPrefix = prefix === undefined ||
      (/^\d+$/.test(prefix) && Number(prefix) > 0 && Number(prefix) <= (family === 4 ? 32 : 128));
    if (!family || !validPrefix || extra !== undefined) {
      throw new Error('IDENTITY_TRUSTED_PROXIES must contain explicit IP addresses or CIDRs.');
    }
  }
  return proxies;
}

export async function createApplication(options?: NestApplicationOptions) {
  const app = await NestFactory.create(AppModule, options);
  const proxies = trustedProxies();
  if (proxies.length) app.getHttpAdapter().getInstance().set('trust proxy', proxies);
  app.use('/identity', (_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  const config = new DocumentBuilder().setTitle('VolunTrack API').setVersion('1.0')
    .addCookieAuth(SESSION_COOKIE, { type: 'apiKey', in: 'cookie' }, 'session').build();
  SwaggerModule.setup('openapi', app, () => SwaggerModule.createDocument(app, config), {
    ui: false, raw: ['json'], jsonDocumentUrl: '/openapi.json',
  });
  return app;
}

async function bootstrap(): Promise<void> {
  const app = await createApplication();
  app.enableShutdownHooks();
  await app.listen(3000);
}

if (require.main === module) void bootstrap();
