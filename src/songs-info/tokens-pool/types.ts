import Redis from 'ioredis';

export interface RedisWithScripts extends Redis {
  tryAcquireLease(
    key: string,
    maxConcurrent: number,
    ttlMs: number,
    leaseId: string,
  ): Promise<-1 | number>;
  releaseLease(key: string, leaseId: string): Promise<boolean>;
  releaseRefresh(key: string, leaseId: string): Promise<boolean>;
}
