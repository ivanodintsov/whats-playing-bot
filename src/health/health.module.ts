import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule],
  providers: [ConfigService],
  controllers: [HealthController],
})
export class HealthModule {}
