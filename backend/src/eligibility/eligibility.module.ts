import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PrismaModule } from '../prisma.module';
import { EligibilityController } from './eligibility.controller';
import { EligibilityService } from './eligibility.service';
import { TrainingService } from './training.service';

@Module({
  imports: [PrismaModule, IdentityModule],
  controllers: [EligibilityController],
  providers: [EligibilityService, TrainingService],
  exports: [EligibilityService, TrainingService],
})
export class EligibilityModule {}
