import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { nowInDatabase, positionCounts, scheduleJob } from '../participation/participation-store';
import { PrismaModule } from '../prisma.module';
import { EventsController, PlanningController } from './planning.controller';
import { PLANNING_PARTICIPATION, PlanningService, type PlanningParticipation } from './planning.service';

@Module({
  imports: [PrismaModule, IdentityModule],
  controllers: [EventsController, PlanningController],
  providers: [PlanningService, {
    provide: PLANNING_PARTICIPATION,
    useValue: {
      async counts(tx, positionId) {
        return positionCounts(tx, positionId, await nowInDatabase(tx));
      },
      async capacityChanged(tx, positionId, previous, current) {
        if (!current || !previous) {
          await tx.participationPlacement.updateMany({
            where: { positionId, state: current ? 'SUSPENDED' : 'QUEUED' },
            data: { state: current ? 'QUEUED' : 'SUSPENDED' },
          });
        }
        await scheduleJob(tx, 'POSITION', positionId, await nowInDatabase(tx));
      },
      async eventChanged(tx, eventId) {
        await scheduleJob(tx, 'EVENT', eventId, await nowInDatabase(tx));
      },
    } satisfies PlanningParticipation,
  }],
  exports: [PlanningService],
})
export class PlanningModule {}
