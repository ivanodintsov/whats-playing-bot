import * as crypto from 'crypto';
import { MusicServiceToken } from 'src/music-services/models/music-service-token.model';
import { sleep } from 'src/utils/sleep';
import { RefreshTimeoutException } from './errors/RefreshTimeoutException';
import { TokenReleasedException } from './errors/TokenReleasedException';
import { RedisWithScripts } from 'src/redis/redis-with-custom-methods/types';

export abstract class PooledToken<TToken = unknown> {
  public pooledId: crypto.UUID;

  protected readonly token: TToken;
  protected REFRESH_POLL_INTERVAL: number;

  abstract getFreshToken(): Promise<TToken>;
  abstract getRefreshToken(): string;
  abstract release(): Promise<boolean>;
  public abstract withRefresh<T>(
    callback: () => Promise<T>,
  ): Promise<T | undefined>;
  abstract invalidate(reason?: unknown): Promise<void>;

  abstract markCooldown(reason?: unknown): Promise<void>;

  abstract getBasicKey(): string;
  abstract getCooldownKey(): string;
  abstract getRefreshKey(): string;
  abstract getAcquiredCountKey(): string;

  abstract tokenId: string;
  abstract tokenService: unknown;
  abstract ownerReference: unknown;
}

export class MusicServicePooledToken extends PooledToken<MusicServiceToken> {
  private released = false;
  protected REFRESH_POLL_INTERVAL = 100;

  constructor(
    private readonly redis: RedisWithScripts,
    protected readonly token: MusicServiceToken,
  ) {
    super();
    this.pooledId = crypto.randomUUID();
  }

  get tokenService() {
    return this.token.service;
  }

  get ownerReference() {
    return {
      userId: this.token.userId,
      provider: this.token.provider,
    };
  }

  get tokenId() {
    return this.token.id;
  }

  async getFreshToken(): Promise<MusicServiceToken> {
    this.ensureNotReleased();

    const isRefreshed = await this.waitRefreshIfNeeded();

    if (isRefreshed) {
      await this.token.reload();
    }

    return this.token;
  }

  getRefreshToken(): MusicServiceToken['refresh_token'] {
    return this.token.refresh_token;
  }

  async release(): Promise<boolean> {
    this.ensureNotReleased();

    this.released = true;

    await this.endRefresh();
    await this.redis.del(this.getCooldownKey());

    const released = await this.redis.releaseLease(
      this.getAcquiredCountKey(),
      this.pooledId,
    );

    return !!released;
  }

  async markCooldown(seconds: number = 300): Promise<void> {
    this.ensureNotReleased();

    await this.redis.set(this.getCooldownKey(), this.pooledId, 'EX', seconds);
  }

  async withRefresh<T>(callback: () => Promise<T>): Promise<T | undefined> {
    const acquired = await this.startRefresh();

    if (!acquired) {
      await this.waitRefreshIfNeeded();
      return;
    }

    try {
      return await callback();
    } finally {
      await this.endRefresh();
    }
  }

  private async startRefresh(): Promise<boolean> {
    this.ensureNotReleased();

    const result = await this.redis.set(
      this.getRefreshKey(),
      this.pooledId,
      'EX',
      60,
      'NX',
    );

    return result === 'OK';
  }

  getAcquiredCountKey(): string {
    return MusicServicePooledToken.getAcquiredCountKey(this);
  }

  private async endRefresh() {
    await this.redis.releaseLock(this.getRefreshKey(), this.pooledId);
  }

  async invalidate(): Promise<void> {
    await this.token.destroy();
    await this.release();
  }

  private async waitRefreshIfNeeded(timeout: number = 10000) {
    const startedAt = Date.now();
    let isRefreshed = false;

    while (await this.isRefreshingNow()) {
      isRefreshed = true;

      if (Date.now() - startedAt > timeout) {
        throw new RefreshTimeoutException();
      }

      await sleep(this.REFRESH_POLL_INTERVAL);
    }

    return isRefreshed;
  }

  private async isRefreshingNow(): Promise<boolean> {
    const result = await this.redis.exists(this.getRefreshKey());
    return !!result;
  }

  private ensureNotReleased() {
    if (this.released) {
      throw new TokenReleasedException();
    }
  }

  getBasicKey() {
    return MusicServicePooledToken.getBasicKey(this);
  }

  getCooldownKey() {
    return MusicServicePooledToken.getCooldownKey(this);
  }

  getRefreshKey() {
    return MusicServicePooledToken.getRefreshKey(this);
  }

  static getBasicKey(token: PooledToken) {
    return `token_pool:${token.tokenId}`;
  }

  static getAcquiredCountKey(token: PooledToken) {
    return `${MusicServicePooledToken.getBasicKey(token)}:acquired`;
  }

  static getCooldownKey(token: PooledToken) {
    return `${MusicServicePooledToken.getBasicKey(token)}:cooldown`;
  }

  static getRefreshKey(token: PooledToken) {
    return `${MusicServicePooledToken.getBasicKey(token)}:refresh`;
  }
}
