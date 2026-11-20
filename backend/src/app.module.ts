import { Module } from '@nestjs/common';
import { IdentityModule } from './identity/identity.module';
import { PrismaModule } from './prisma.module';
import { ReadinessController } from './readiness.controller';

@Module({
  imports: [PrismaModule, IdentityModule],
  controllers: [ReadinessController],
})
export class AppModule {}
