import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ReadinessController } from './readiness.controller';

@Module({
  controllers: [ReadinessController],
  providers: [PrismaService],
})
export class AppModule {}
