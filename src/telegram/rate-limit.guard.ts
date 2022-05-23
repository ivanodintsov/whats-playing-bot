import { rateLimitMiddleware } from './rate-limit';
import { Context } from './types';

export const RateLimit = function(
  targetClass: any,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<(ctx: Context) => Promise<void>>,
) {
  const originalFn = descriptor.value;

  descriptor.value = async function(ctx: Context) {
    return rateLimitMiddleware(ctx, originalFn.bind(this, ctx));
  };

  return descriptor;
};
