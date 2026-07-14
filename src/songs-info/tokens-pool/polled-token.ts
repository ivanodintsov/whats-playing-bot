import * as crypto from 'crypto';
import { MusicServiceToken } from 'src/music-services/models/music-service-token.model';
import { sleep } from 'src/utils/sleep';
import { RefreshTimeoutException } from './errors/RefreshTimeoutException';
import { RedisWithScripts } from './types';
import { TokenReleasedException } from './errors/TokenReleasedException';

export abstract class PooledToken<TToken = unknown> {
  public pooledId: crypto.UUID;

  protected readonly token: TToken;
  protected REFRESH_POLL_INTERVAL: number;

  abstract getFreshToken(): Promise<TToken>;
  abstract getRefreshToken(): string;
  abstract release(): Promise<void>;
  public abstract withRefresh<T>(
    callback: () => Promise<T>,
  ): Promise<T | undefined>;
  abstract invalidate(reason?: unknown): Promise<void>;

  abstract markCooldown(reason?: unknown): Promise<void>;

  abstract getBasicKey(): string;
  abstract getCooldownKey(): string;
  abstract getRefreshKey(): string;

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

  async release(): Promise<void> {
    this.ensureNotReleased();

    this.released = true;
  }

  async markCooldown(seconds: number = 300): Promise<void> {
    this.ensureNotReleased();

    await this.redis.set(this.getCooldownKey(), '1', 'EX', seconds);
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

  private async endRefresh() {
    await this.redis.releaseRefresh(this.getRefreshKey(), this.pooledId);
  }

  async invalidate(): Promise<void> {
    await this.token.destroy();

    await this.endRefresh();
    await this.redis.del(this.getCooldownKey());
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
    return MusicServicePooledToken.getBasicKey(this.token);
  }

  getCooldownKey() {
    return MusicServicePooledToken.getCooldownKey(this.token);
  }

  getRefreshKey() {
    return MusicServicePooledToken.getRefreshKey(this.token);
  }

  static getBasicKey(token: MusicServiceToken) {
    return `token_pool:${token.id}`;
  }

  static getCooldownKey(token: MusicServiceToken) {
    return `${MusicServicePooledToken.getBasicKey(token)}:cooldown`;
  }

  static getRefreshKey(token: MusicServiceToken) {
    return `${MusicServicePooledToken.getBasicKey(token)}:refresh`;
  }
}
