import Redis from 'ioredis';

export interface PooledToken<TToken> {
  readonly token: TToken;

  release(): Promise<void>;

  invalidate(reason?: unknown): Promise<void>;
}

export class RedisPooledToken<
  T extends { id: number | string },
> implements PooledToken<T> {
  private released = false;

  constructor(
    public readonly token: T,
    private readonly redis: Redis,
  ) {}

  async release(): Promise<void> {
    if (this.released) {
      return;
    }

    this.released = true;

    await this.redis.del(this.getLockKey());
  }

  async invalidate(): Promise<void> {
    await this.redis.del(this.getLockKey());
    await this.redis.set(this.getCooldownKey(), '1', 'EX', 300);
  }

  private getLockKey() {
    return `token_pool:lock:${this.token.id}`;
  }

  private getCooldownKey() {
    return `token_pool:cooldown:${this.token.id}`;
  }
}
