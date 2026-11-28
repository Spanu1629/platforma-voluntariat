import { Module } from '@nestjs/common';
import { EligibilityModule } from '../eligibility/eligibility.module';
import { IdentityModule } from '../identity/identity.module';
import { PrismaModule } from '../prisma.module';
import { ParticipationController, ParticipationTrainingController } from './participation.controller';
import { ParticipationJobs } from './participation-jobs';
import { ParticipationService } from './participation.service';

@Module({
  imports: [PrismaModule, IdentityModule, EligibilityModule],
  controllers: [ParticipationController, ParticipationTrainingController],
  providers: [ParticipationJobs, ParticipationService],
})
export class ParticipationModule {}
