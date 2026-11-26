import { Module } from '@nestjs/common';
import { EligibilityModule } from './eligibility/eligibility.module';
import { IdentityModule } from './identity/identity.module';
import { PlanningModule } from './planning/planning.module';
import { PrismaModule } from './prisma.module';
import { ReadinessController } from './readiness.controller';

@Module({
  imports: [PrismaModule, IdentityModule, PlanningModule, EligibilityModule],
  controllers: [ReadinessController],
})
export class AppModule {}
