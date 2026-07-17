import { Inject, Injectable } from '@nestjs/common';
import { REDIS_WITH_CUSTOM_METHODS } from 'src/redis/redis-with-custom-methods/constants';
import { RedisWithScripts } from 'src/redis/redis-with-custom-methods/types';

@Injectable()
export class DistributedLockService {
  constructor(
    @Inject(REDIS_WITH_CUSTOM_METHODS)
    private readonly redis: RedisWithScripts,
  ) {}

  async lock(key: string, id, timeout: number) {
    const created = await this.redis.set(key, id, 'EX', timeout, 'NX');
    return created === 'OK';
  }

  async release(key: string, id) {
    const result = await this.redis.releaseLock(key, id);
    return !!result;
  }
}
