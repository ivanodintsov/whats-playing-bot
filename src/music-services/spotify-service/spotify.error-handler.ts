import * as R from 'ramda';
import { Logger } from '@nestjs/common';
import { NO_ACTIVE_DEVICE, PREMIUM_REQUIRED } from './constants';
import { NoServiceSubscriptionError } from 'src/errors';
import { NoActiveDeviceError } from 'src/errors/NoActiveDeviceError';

const spotifyApiHandleErrorsLogger = new Logger('SpotifyApiHandleErrorsLogger');

export const SpotifyErrorHandler = function () {
  return function (
    targetClass: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: any[]) => Promise<any>>,
  ) {
    const originalFn = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        const response = await originalFn.call(this, ...args);
        return response;
      } catch (error) {
        const reason = R.path(['body', 'error', 'reason'], error);

        if (reason === PREMIUM_REQUIRED) {
          throw new NoServiceSubscriptionError();
        }

        if (reason === NO_ACTIVE_DEVICE) {
          throw new NoActiveDeviceError();
        }

        if (error instanceof Error) {
          spotifyApiHandleErrorsLogger.debug(
            error.message,
            error.stack,
            JSON.stringify(error),
          );
        }

        spotifyApiHandleErrorsLogger.debug(
          R.path(['body', 'error'], error),
          R.path(['body', 'error', 'reason'], error),
        );

        throw error;
      }
    };

    return descriptor;
  };
};
