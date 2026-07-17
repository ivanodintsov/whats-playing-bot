import { Module } from '@nestjs/common';
import { DistributedSingleFlightService } from './distributed-single-flight.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DISTRIBUTED_SINGLE_FLIGHT_SUB } from './constants';
import { DistributedLockService } from './distributed-lock/distributed-lock.service';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [ConfigModule, RedisModule],
  providers: [
    {
      provide: DISTRIBUTED_SINGLE_FLIGHT_SUB,
      useFactory: (configService: ConfigService) =>
        new Redis(
          `redis://${configService.get('REDIS_DISTRIBUTION_HOST')}:${+configService.get(
            'REDIS_DISTRIBUTION_PORT',
          )}/${+configService.get('REDIS_DISTRIBUTION_DB')}`,
          {
            retryStrategy(times) {
              const delay = Math.min(times * 50, 2000);
              return delay;
            },
          },
        ),
      inject: [ConfigService],
    },
    DistributedSingleFlightService,
    DistributedLockService,
    ConfigService,
  ],
  exports: [DistributedSingleFlightService],
})
export class DistributedSingleFlightModule {}
