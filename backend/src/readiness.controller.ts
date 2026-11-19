import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('health')
export class ReadinessController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('ready')
  async ready(): Promise<void> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException();
    }
  }
}
