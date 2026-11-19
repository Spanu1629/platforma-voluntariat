import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

const DATABASE_TIMEOUT_MS = 1000;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required.');
    }

    super({
      adapter: new PrismaPg({
        connectionString,
        connectionTimeoutMillis: DATABASE_TIMEOUT_MS,
        query_timeout: DATABASE_TIMEOUT_MS,
        statement_timeout: DATABASE_TIMEOUT_MS,
      }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
