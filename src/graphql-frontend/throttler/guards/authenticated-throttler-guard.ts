import { extractAuthContextFromRequest } from 'src/auth/utils';
import { AdaptiveThrottlerGuard } from './adaptive-throttler-guard';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { RequestWithUser } from 'src/auth/types';
import { InappropriateThrottlerError } from 'src/errors/InappropriateThrottlerError';

@Injectable()
export class AuthenticatedThrottlerGuard extends AdaptiveThrottlerGuard {
  async canApply(context: ExecutionContext): Promise<boolean> {
    const { req } = this.getRequestResponse(context);
    const authContext = extractAuthContextFromRequest(req);
    return !!authContext;
  }

  protected getRequestResponse(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext();
    return { req: ctx.req, res: ctx.res };
  }

  protected async getTracker(req: RequestWithUser): Promise<string> {
    const authContext = extractAuthContextFromRequest(req);

    if (!authContext) {
      throw new InappropriateThrottlerError();
    }

    return `user:${authContext.user.id}`;
  }
}
