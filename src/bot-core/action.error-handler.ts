import { Logger } from 'src/logger';
import { Message } from './message/message';
import { Sender } from './sender.service';
import {
  NoMusicServiceError,
  NoServiceSubscriptionError,
  NoTrackError,
} from 'src/errors';
import { MaintenanceError, UserNotExistsError } from './errors';

export const ActionErrorsHandler = function() {
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
        if (
          error instanceof NoMusicServiceError ||
          error instanceof UserNotExistsError
        ) {
          await sender.signUpActionAnswer(message);
        } else if (error instanceof NoTrackError) {
          await sender.noTrackActionAnswer(message);
        } else if (error instanceof NoServiceSubscriptionError) {
          await sender.noMusicServiceSubscriptionActionAnswer(message);
        } else if (error instanceof MaintenanceError) {
          await sender.sendUnderMaintenanceActionAnswer(message);
        } else {
          logger.error(error.message);
          await sender.noActiveDevicesActionAnswer(message);
        }
      } catch (error) {
        logger.error(error.message);
      }
    }

    descriptor.value = async function(message: Message, ...args: any[]) {
      const logger: Logger = this.logger;

      if (!logger) {
        throw new Error('no Logger dependency');
      }

      try {
        this.checkAppMode(message);
        const response = await originalFn.call(this, message, ...args);
        return response;
      } catch (error) {
        handleError.call(this, message, error);
      }
    };

    return descriptor;
  };
};
