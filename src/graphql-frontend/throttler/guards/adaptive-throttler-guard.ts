import { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';

export type DynamicConfig = Partial<Pick<ThrottlerRequest, 'ttl' | 'limit'>>;
export type DynamicConfigRecord = Record<string, DynamicConfig>;

export abstract class AdaptiveThrottlerGuard extends ThrottlerGuard {
  abstract canApply(context: ExecutionContext): Promise<boolean>;

  private getDynamicConfigKey() {
    return `__throttler_dynamic_config_${this.constructor.name}`;
  }

  private async getDynamicConfig(
    requestProps: ThrottlerRequest,
  ): Promise<DynamicConfig> {
    const { req } = this.getRequestResponse(requestProps.context);
    const config = req[this.getDynamicConfigKey()];
    return config
      ? config[requestProps.throttler.name] || config['default']
      : undefined;
  }

  async setDynamicConfig(
    context: ExecutionContext,
    config: DynamicConfigRecord,
  ): Promise<void> {
    const { req } = this.getRequestResponse(context);
    req[this.getDynamicConfigKey()] = config;
  }

  private async getDynamicRequestProps(
    requestProps: ThrottlerRequest,
  ): Promise<ThrottlerRequest> {
    const dynamicConfig = await this.getDynamicConfig(requestProps);

    if (dynamicConfig) {
      return {
        ...requestProps,
        limit: dynamicConfig.limit || requestProps.limit,
        ttl: dynamicConfig.ttl || requestProps.ttl,
      };
    }

    return requestProps;
  }

  protected override async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const dynamicRequestProps = await this.getDynamicRequestProps(requestProps);

    return super.handleRequest(dynamicRequestProps);
  }
}
