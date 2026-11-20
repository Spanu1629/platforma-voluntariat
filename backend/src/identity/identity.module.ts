import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { IdentityController } from './identity.controller';
import { IdentityCsrf, IdentityExceptionFilter } from './identity-http';
import { IdentityMailWorker, SimulatedIdentityDelivery } from './identity-mail';
import { IdentityService } from './identity.service';
import { IdentitySettings } from './identity-settings';

@Module({
  imports: [PrismaModule],
  controllers: [IdentityController],
  providers: [
    IdentitySettings, IdentityService, IdentityCsrf, IdentityExceptionFilter,
    IdentityMailWorker, SimulatedIdentityDelivery,
  ],
})
export class IdentityModule {}
