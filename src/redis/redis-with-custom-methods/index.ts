import Redis from 'ioredis';
import { REDIS_WITH_CUSTOM_METHODS } from './constants';
import { ConfigService } from '@nestjs/config';

export const REDIS_WITH_CUSTOM_METHODS_PROVIDER = {
  provide: REDIS_WITH_CUSTOM_METHODS,
  useFactory: (configService: ConfigService) => {
    const redis = new Redis(
      `redis://${configService.get('REDIS_DISTRIBUTION_HOST')}:${+configService.get(
        'REDIS_DISTRIBUTION_PORT',
      )}/${+configService.get('REDIS_DISTRIBUTION_DB')}`,
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

            local expiresTtl = tonumber(ARGV[2])
            local expiresAt = now + expiresTtl

            redis.call(
              'ZADD',
              KEYS[1],
              expiresAt,
              ARGV[3]
            )

            local currentTtl = redis.call('PTTL', KEYS[1])

            if currentTtl < 0 or currentTtl < expiresTtl then
              redis.call(
                'PEXPIRE',
                KEYS[1],
                expiresTtl
              )
            end

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

            local removed = redis.call(
              'ZREM',
              KEYS[1],
              ARGV[1]
            )

            if redis.call('ZCARD', KEYS[1]) == 0 then
              redis.call('DEL', KEYS[1])
            end

            return removed
          `,
    });

    redis.defineCommand('releaseLock', {
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
};
