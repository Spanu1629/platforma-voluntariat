import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PrismaModule } from '../prisma.module';
import { EventsController, PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';

@Module({
  imports: [PrismaModule, IdentityModule],
  controllers: [EventsController, PlanningController],
  providers: [PlanningService],
  exports: [PlanningService],
})
export class PlanningModule {}
