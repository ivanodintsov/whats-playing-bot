import {
  BadRequestException,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdaptiveThrottlerGuard } from './adaptive-throttler-guard';
import { GqlExecutionContext } from '@nestjs/graphql';
import { InappropriateThrottlerError } from 'src/errors/InappropriateThrottlerError';
import { parseIps } from 'src/graphql-frontend/utils/getRealIp';
import { RequestWithUser } from 'src/auth/types';

@Injectable()
export class SSRThrottlerGuard extends AdaptiveThrottlerGuard {
  @Inject(ConfigService)
  configService: ConfigService;

  protected getRequestResponse(context: ExecutionContext) {
    const gqlCtx = GqlExecutionContext.create(context);
    const ctx = gqlCtx.getContext();
    return { req: ctx.req, res: ctx.res };
  }

  async canApply(context: ExecutionContext): Promise<boolean> {
    const { req } = this.getRequestResponse(context);
    const serviceTokenHeader = req.headers['x-service-token'];
    const serviceUserAgentHeader = req.headers['x-service-user-agent'];

    return !!serviceTokenHeader || !!serviceUserAgentHeader;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { req } = this.getRequestResponse(context);

    const serviceTokenHeader = req.headers['x-service-token'];
    const serviceUserAgentHeader = req.headers['x-service-user-agent'];

    if (serviceTokenHeader || serviceUserAgentHeader) {
      const serviceToken = this.configService.getOrThrow<string>(
        'FRONTEND_SSR_SERVICE_TOKEN',
      );
      const serviceUserAgent = this.configService.getOrThrow<string>(
        'FRONTEND_SSR_USER_AGENT',
      );

      if (
        serviceTokenHeader === serviceToken &&
        serviceUserAgentHeader === serviceUserAgent
      ) {
        console.log('service', req.headers);
        return super.canActivate(context);
      }

      throw new BadRequestException();
    }

    throw new InappropriateThrottlerError();
  }

  protected async getTracker(req: RequestWithUser): Promise<string> {
    const serviceRealIp = parseIps(req.headers['x-service-real-ip'])[0];

    if (!serviceRealIp) {
      throw new BadRequestException('Missing ip');
    }

    return `ip:${serviceRealIp}`;
  }
}
