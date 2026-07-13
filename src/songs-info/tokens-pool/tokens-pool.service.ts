import { Inject, Injectable } from '@nestjs/common';
import { MUSIC_SERVICE_PROVIDERS } from 'src/constants';
import {
  MusicServiceToken,
  MusicServiceTokenDomain,
} from 'src/music-services/models/music-service-token.model';
import { InjectModel } from '@nestjs/sequelize';
import Redis from 'ioredis';
import { Op } from 'sequelize';
import { NoAvailableTokenException } from './errors/NoAvailableTokenException';
import { PooledToken, RedisPooledToken } from './polled-tooken';

export interface TokenPool<TToken> {
  acquire(service: MUSIC_SERVICE_PROVIDERS): Promise<PooledToken<TToken>>;
}

@Injectable()
export class TokensPoolService<
  T extends MusicServiceTokenDomain = MusicServiceToken,
> implements TokenPool<T> {
  constructor(
    private readonly redis: Redis,

    @InjectModel(MusicServiceToken)
    private musicServiceTokenModel: typeof MusicServiceToken,
  ) {}

  async acquire(service: MUSIC_SERVICE_PROVIDERS): Promise<PooledToken<T>> {
    const excludedIds: T['id'][] = [];

    while (true) {
      const token = await this.musicServiceTokenModel.findOne({
        where: {
          service,
          id: {
            [Op.notIn]: excludedIds,
          },
        },
      });

      if (!token) {
        throw new NoAvailableTokenException();
      }

      const acquired = await this.tryAcquire(token.id);

      if (acquired) {
        return new RedisPooledToken(token.toJSON(), this.redis);
      }

      excludedIds.push(token.id);
    }
  }

  private async tryAcquire(id: T['id']): Promise<boolean> {
    const cooldown = await this.redis.exists(`token_pool:cooldown:${id}`);

    if (cooldown) {
      return false;
    }

    const result = await this.redis.set(
      `token_pool:lock:${id}`,
      process.pid.toString(),
      'EX',
      60,
      'NX',
    );

    return result === 'OK';
  }
}
