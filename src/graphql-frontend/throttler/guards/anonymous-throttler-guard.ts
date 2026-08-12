import {
  BadRequestException,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AdaptiveThrottlerGuard } from './adaptive-throttler-guard';
import { GqlExecutionContext } from '@nestjs/graphql';
import { RequestWithUser } from 'src/auth/types';
import { parseIps } from 'src/graphql-frontend/utils/getRealIp';

@Injectable()
export class AnonymousThrottlerGuard extends AdaptiveThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext();
    return { req: ctx.req, res: ctx.res };
  }

  async canApply(context: ExecutionContext): Promise<boolean> {
    return true;
  }

  protected async getTracker(req: RequestWithUser): Promise<string> {
    const ip = parseIps(req.ips)[0] || req.ip;
    const realIp = parseIps(req.headers['x-real-ip'])[0];

    if (!ip || !realIp) {
      throw new BadRequestException('Missing ip');
    }

    console.log('frontend', realIp, ip, req.headers);

    return `ip:${realIp || ip}`;
  }
}
