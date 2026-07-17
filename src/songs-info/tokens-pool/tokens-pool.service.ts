import { Inject, Injectable } from '@nestjs/common';
import { CLIENT_UNIQUE_PROVIDES, MUSIC_SERVICE_PROVIDERS } from 'src/constants';
import { MusicServiceToken } from 'src/music-services/models/music-service-token.model';
import { InjectModel } from '@nestjs/sequelize';
import { NoAvailableTokenException } from './errors/NoAvailableTokenException';
import { PooledToken, MusicServicePooledToken } from './polled-token';
import { isDefined } from 'src/utils/isDefined';
import { REDIS_WITH_CUSTOM_METHODS } from 'src/redis/redis-with-custom-methods/constants';
import { RedisWithScripts } from 'src/redis/redis-with-custom-methods/types';

export enum TokenPriority {
  USER = 2,
  BACKGROUND = 1,
}

type AcquireUserOptions = {
  priority: TokenPriority.USER;
  userId: string;
  service: MUSIC_SERVICE_PROVIDERS;
  provider: CLIENT_UNIQUE_PROVIDES;
};

type AcquireBackgroundOptions = {
  service: MUSIC_SERVICE_PROVIDERS;
  priority: TokenPriority.BACKGROUND;
};

type AcquireOptions = AcquireUserOptions | AcquireBackgroundOptions;

export abstract class TokenPool {
  protected AQUIRES_LIMIT: Record<TokenPriority, number>;
  protected MAX_TOKEN_ACQUIRE_TTL: number;

  abstract acquireBackground(
    options: AcquireBackgroundOptions,
  ): Promise<PooledToken>;
  abstract acquireByUser(options: AcquireUserOptions): Promise<PooledToken>;
  abstract acquireTokensByUser(
    options: AcquireUserOptions,
  ): Promise<PooledToken[]>;
  abstract release(token: PooledToken): Promise<boolean>;
}

@Injectable()
export class TokensPoolService extends TokenPool {
  protected AQUIRES_LIMIT = {
    [TokenPriority.USER]: 100,
    [TokenPriority.BACKGROUND]: 5,
  };
  protected MAX_TOKEN_ACQUIRE_TTL = 1000 * 60;

  constructor(
    @Inject(REDIS_WITH_CUSTOM_METHODS)
    private readonly redis: RedisWithScripts,

    @InjectModel(MusicServiceToken)
    private musicServiceTokenModel: typeof MusicServiceToken,
  ) {
    super();
  }

  async acquireBackground(
    options: Omit<AcquireBackgroundOptions, 'priority'>,
  ): Promise<MusicServicePooledToken> {
    if (!isDefined(options.service)) {
      throw new Error('AcquireUserOptions Error');
    }

    let offset = 0;

    while (true) {
      const tokens = await this.musicServiceTokenModel.findAll({
        where: {
          service: options.service,
        },
        limit: 20,
        offset,
        order: [['updatedAt', 'DESC']],
      });

      if (tokens.length === 0) {
        throw new NoAvailableTokenException();
      }

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const polledToken = new MusicServicePooledToken(this.redis, token);
        const acquired = await this.tryAcquire(polledToken, {
          priority: TokenPriority.BACKGROUND,
        });

        if (acquired) {
          return polledToken;
        }
      }

      offset += tokens.length;
    }
  }

  async acquireByUser(
    options: Omit<AcquireUserOptions, 'priority'>,
  ): Promise<MusicServicePooledToken> {
    if (
      !isDefined(options.provider) ||
      !isDefined(options.userId) ||
      !isDefined(options.service)
    ) {
      throw new Error('AcquireUserOptions Error');
    }

    const token = await this.musicServiceTokenModel.findOne({
      where: {
        userId: options.userId,
        provider: options.provider,
        service: options.service,
      },
    });

    if (!token) {
      throw new NoAvailableTokenException();
    }

    const polledToken = new MusicServicePooledToken(this.redis, token);
    const acquired = await this.tryAcquire(polledToken, {
      priority: TokenPriority.USER,
    });

    if (!acquired) {
      throw new NoAvailableTokenException();
    }

    return polledToken;
  }

  async acquireTokensByUser(
    options: Omit<AcquireUserOptions, 'priority' | 'service'>,
  ): Promise<MusicServicePooledToken[]> {
    if (!isDefined(options.provider) || !isDefined(options.userId)) {
      throw new Error('AcquireUserOptions Error');
    }

    const polledTokenList: MusicServicePooledToken[] = [];
    const tokenList = await this.musicServiceTokenModel.findAll({
      where: {
        userId: options.userId,
        provider: options.provider,
      },
    });

    for (let i = 0; i < tokenList.length; i++) {
      const token = tokenList[i];

      const polledToken = new MusicServicePooledToken(this.redis, token);
      const acquired = await this.tryAcquire(polledToken, {
        priority: TokenPriority.USER,
      });

      if (acquired) {
        polledTokenList.push(polledToken);
      }
    }

    if (!tokenList?.length) {
      throw new NoAvailableTokenException();
    }

    return polledTokenList;
  }

  public async release(token: MusicServicePooledToken) {
    return token.release();
  }

  private async tryAcquire(
    token: MusicServicePooledToken,
    options: Pick<AcquireOptions, 'priority'>,
  ): Promise<boolean> {
    const cooldown = await this.redis.exists(token.getCooldownKey());

    if (cooldown) {
      return false;
    }

    const acquiredCount = await this.redis.tryAcquireLease(
      MusicServicePooledToken.getAcquiredCountKey(token),
      this.AQUIRES_LIMIT[options.priority] || 0,
      this.MAX_TOKEN_ACQUIRE_TTL,
      token.pooledId,
    );

    if (acquiredCount === -1) {
      return false;
    }

    return true;
  }
}
