import { Logger } from '@nestjs/common';
import { PrivateOnlyError } from './errors';
import { Sender } from './sender.service';
import { Message } from './message/message';
import {
  ExpiredMusicServiceTokenError,
  NoMusicServiceError,
  NoServiceSubscriptionError,
  NoTrackError,
} from 'src/errors';

export const MessageErrorsHandler = function() {
  return function(
    targetClass: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<
      (message: Message, ...args: any[]) => Promise<void>
    >,
  ) {
    const originalFn = descriptor.value;

    async function handleError(message: Message, error: Error) {
      const logger: Logger = this.logger;
      const sender: Sender = this.sender;

      try {
        if (error instanceof PrivateOnlyError) {
          await sender.onPrivateOnly(message);
        } else if (error instanceof NoMusicServiceError) {
          await sender.sendNoConnectedMusicService(message);
        } else if (error instanceof NoTrackError) {
          await sender.sendNoTrack(message);
        } else if (error instanceof ExpiredMusicServiceTokenError) {
          await sender.sendExpiredMusicService(message);
        } else if (error instanceof NoServiceSubscriptionError) {
          await sender.sendNoMusicServiceSubscription(message);
        } else {
          logger.error(error.message, error.stack);
        }
      } catch (error) {
        logger.error(error.message, error.stack);
      }
    }

    descriptor.value = async function(message: Message, ...args: any[]) {
      const logger: Logger = this.logger;

      if (!logger) {
        throw new Error('no Logger dependency');
      }

      try {
        const response = await originalFn.call(this, message, ...args);
        return response;
      } catch (error) {
        handleError.call(this, message, error);
      }
    };

    return descriptor;
  };
};
