import { Logger } from 'src/logger';
import { Sender } from './sender.service';
import { Message } from './message/message';
import { NoMusicServiceError, NoTrackError } from 'src/errors';

export const SearchErrorHandler = function() {
  return function(
    targetClass: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(message: Message) => Promise<void>>,
  ) {
    const originalFn = descriptor.value;

    async function handleError(message: Message, error: Error) {
      const logger: Logger = this.logger;
      const sender: Sender = this.sender;

      try {
        if (error instanceof NoMusicServiceError) {
          await sender.sendSearchSignUp(message);
        } else if (error instanceof NoTrackError) {
          await sender.sendSearchNoTrack(message);
        } else {
          logger.error(error);
        }
      } catch (error) {
        logger.error(error.message);
      }
    }

    descriptor.value = async function(message: Message) {
      const logger: Logger = this.logger;

      if (!logger) {
        throw new Error('no Logger dependency');
      }

      try {
        const response = await originalFn.call(this, message);
        return response;
      } catch (error) {
        handleError.call(this, message, error);
      }
    };

    return descriptor;
  };
};
