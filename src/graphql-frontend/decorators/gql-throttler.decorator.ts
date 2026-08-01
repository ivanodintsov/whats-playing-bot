import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';
import { RequestWithUser } from 'src/auth/types';
import { extractAuthContextFromRequest } from 'src/auth/utils';
import { applyDecorators, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { THROTTLERS } from 'src/constants';
import { GqlAuthGuard } from '../auth/auth.guard';

@Injectable()
export class AuthenticatedThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext();
    return { req: ctx.req, res: ctx.res };
  }

  protected async getTracker(req: RequestWithUser): Promise<string> {
    const authContext = extractAuthContextFromRequest(req);
    return `user:${authContext.user.id}`;
  }
}

@Injectable()
export class AnonymousThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext();
    return { req: ctx.req, res: ctx.res };
  }

  protected async getTracker(req: RequestWithUser): Promise<string> {
    const ip = req.ips.length ? req.ips[0] : req.ip;
    const realIp = req.headers['x-real-ip'] as string;

    return `ip:${realIp || ip}`;
  }
}

export function ThrottleGqlAuth(
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

export function ThrottleGqlAnon(
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
