import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import Redis from 'ioredis';
import { TokensPoolService } from './tokens-pool.service';
import { MusicServiceToken } from 'src/music-services/models/music-service-token.model';
import { TOKENS_POOL_REDIS_PROVIDER } from './constants';

@Module({
  imports: [
    ConfigModule.forRoot(),
    SequelizeModule.forFeature([MusicServiceToken]),
  ],
  providers: [
    {
      provide: TOKENS_POOL_REDIS_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const redis = new Redis(
          `redis://${configService.get('CACHE_HOST')}:${+configService.get(
            'CACHE_PORT',
          )}/${+configService.get('CACHE_DB')}`,
        );

        redis.defineCommand('tryAcquireLease', {
          numberOfKeys: 1,
          lua: `
            local time = redis.call('TIME')
            local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)

            redis.call(
              'ZREMRANGEBYSCORE',
              KEYS[1],
              '-inf',
              now
            )

            local count = redis.call(
              'ZCARD',
              KEYS[1]
            )

            if count >= tonumber(ARGV[1]) then
              return -1
            end

            local expiresAt = now + tonumber(ARGV[2])

            redis.call(
              'ZADD',
              KEYS[1],
              expiresAt,
              ARGV[3]
            )

            return count + 1
          `,
        });

        redis.defineCommand('releaseLease', {
          numberOfKeys: 1,
          lua: `
            local time = redis.call('TIME')
            local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)

            redis.call(
              'ZREMRANGEBYSCORE',
              KEYS[1],
              '-inf',
              now
            )

            redis.call(
              'ZREM',
              KEYS[1],
              ARGV[1]
            )

            return 1
          `,
        });

        redis.defineCommand('releaseRefresh', {
          numberOfKeys: 1,
          lua: `
            if redis.call("GET", KEYS[1]) == ARGV[1] then
                return redis.call("DEL", KEYS[1])
            end

            return 0
          `,
        });

        return redis;
      },
      inject: [ConfigService],
    },
    TokensPoolService,
  ],
  exports: [TokensPoolService],
})
export class TokensPoolModule {}
