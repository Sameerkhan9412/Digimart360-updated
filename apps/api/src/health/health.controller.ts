import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  /** Liveness and database check, for load balancers and uptime monitors. */
  @Get()
  @Public()
  @SkipThrottle()
  @HealthCheck()
  check() {
    return this.health.check([() => this.db.pingCheck('database', this.prisma)]);
  }
}
