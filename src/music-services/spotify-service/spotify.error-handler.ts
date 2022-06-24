import * as R from 'ramda';
import { PREMIUM_REQUIRED } from './constants';
import { NoServiceSubscriptionError } from 'src/errors';

export const SpotifyErrorHandler = function() {
  return function(
    targetClass: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<any>>,
  ) {
    const originalFn = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      try {
        const response = await originalFn.call(this, ...args);
        return response;
      } catch (error) {
        const reason = R.path(['body', 'error', 'reason'], error);

        if (reason === PREMIUM_REQUIRED) {
          throw new NoServiceSubscriptionError();
        }

        throw error;
      }
    };

    return descriptor;
  };
};
