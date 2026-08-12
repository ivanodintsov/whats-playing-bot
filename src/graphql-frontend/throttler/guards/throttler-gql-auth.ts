import { applyDecorators, UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from 'src/graphql-frontend/auth/auth.guard';
import { AuthenticatedThrottlerGuard } from './authenticated-throttler-guard';
import { Throttle } from '@nestjs/throttler';

export function ThrottlerGqlAuth(
  limit: number = parseInt(
    process.env.AUTHENTICATED_THROTTLE_DEFAULT_LIMIT || '15',
    10,
  ),
  ttl: number = parseInt(
    process.env.AUTHENTICATED_THROTTLE_DEFAULT_TTL || '60000',
    10,
  ),
) {
  return applyDecorators(
    UseGuards(GqlAuthGuard, AuthenticatedThrottlerGuard),
    Throttle({ default: { limit, ttl } }),
  );
}
