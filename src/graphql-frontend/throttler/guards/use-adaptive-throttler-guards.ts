import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  Injectable,
  mixin,
  Type,
  UseGuards,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Maybe } from 'src/typings';
import {
  AdaptiveThrottlerGuard,
  DynamicConfigRecord,
} from './adaptive-throttler-guard';

export const UseAdaptiveThrottlerGuards = (
  ...guardsConfig: {
    guard: Type<AdaptiveThrottlerGuard>;
    config: Maybe<DynamicConfigRecord>;
  }[]
) => {
  @Injectable()
  class ThrottlerRouterGuard implements CanActivate {
    constructor(readonly moduleRef: ModuleRef) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      for (const guardConfig of guardsConfig) {
        const Guard = guardConfig.guard;
        const config = guardConfig.config;
        const guard = this.moduleRef.get(Guard, { strict: false });

        if (!guard) {
          continue;
        }

        if (await guard.canApply(context)) {
          if (config) {
            await guard.setDynamicConfig(context, config);
          }

          return guard.canActivate(context);
        }
      }

      return false;
    }
  }

  return applyDecorators(UseGuards(mixin(ThrottlerRouterGuard)));
};
