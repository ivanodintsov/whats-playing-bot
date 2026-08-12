import { applyDecorators, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AnonymousThrottlerGuard } from './anonymous-throttler-guard';

export function ThrottlerGqlAnon(
  limit: number = parseInt(
    process.env.ANONYMOUS_THROTTLE_DEFAULT_LIMIT || '15',
    10,
  ),
  ttl: number = parseInt(
    process.env.ANONYMOUS_THROTTLE_DEFAULT_TTL || '60000',
    10,
  ),
) {
  return applyDecorators(
    UseGuards(AnonymousThrottlerGuard),
    Throttle({ default: { limit, ttl } }),
  );
}
