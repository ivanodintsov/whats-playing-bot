import { Message } from './message/message';
import { Sender } from './sender.service';
import {
  ExpiredMusicServiceTokenError,
  NoMusicServiceError,
  NoServiceSubscriptionError,
  NoTrackError,
} from 'src/errors';
import { MaintenanceError, UserNotExistsError } from './errors';
import { AbstractBotService } from './bot.service';
import { LoggerService } from '@nestjs/common';
import { NoActiveDeviceError } from 'src/errors/NoActiveDeviceError';
import { NotSupportedByService } from 'src/music-services/music-service-core/errors/NotSupportedByService';
import { BotMethodOptions } from './types';
import { Maybe } from 'src/typings';
import { normalizeBotMethodOptions } from './utils';

export const ActionErrorsHandler = function () {
  return function (
    targetClass: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<
      (
        message: Message,
        options?: Maybe<BotMethodOptions>,
        ...args: any[]
      ) => Promise<void>
    >,
  ) {
    const originalFn = descriptor.value;

    async function handleError(
      this: AbstractBotService,
      message: Message,
      options: BotMethodOptions,
      error: Error,
    ) {
      const logger: LoggerService = this.logger;
      const sender: Sender = this.sender;

      if (!options.withAnswer) {
        if (error instanceof Error) {
          logger.error(error.message, error.stack, error, message);
        } else {
          logger.error(error);
        }
      }

      try {
        if (error instanceof AggregateError) {
          await handleError.call(this, message, error.errors[0]);
          return;
        }

        if (
          error instanceof NoMusicServiceError ||
          error instanceof UserNotExistsError
        ) {
          await sender.signUpActionAnswer(message);
        } else if (error instanceof ExpiredMusicServiceTokenError) {
          await sender.musicServiceTokenExpiredAnswer(message, error);
        } else if (error instanceof NoTrackError) {
          await sender.noTrackActionAnswer(message);
        } else if (error instanceof NoServiceSubscriptionError) {
          await sender.noMusicServiceSubscriptionActionAnswer(message);
        } else if (error instanceof MaintenanceError) {
          await sender.sendUnderMaintenanceActionAnswer(message);
        } else if (error instanceof NoActiveDeviceError) {
          await sender.noActiveDevicesActionAnswer(message);
        } else if (error instanceof NotSupportedByService) {
          await sender.notSupportedByServiceActionAnswer(message);
        } else {
          if (error instanceof Error) {
            logger.debug(error.message, error.stack, error, message);
          } else {
            logger.debug(error);
          }
          await sender.somethingWentWrongActionAnswer(message);
        }
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message, error.stack, error, message);
        } else {
          logger.error(error);
        }
      }
    }

    descriptor.value = async function (
      this: AbstractBotService,
      message: Message,
      options?: Maybe<BotMethodOptions>,
      ...args: any[]
    ) {
      const normalizedOptions = normalizeBotMethodOptions(options);
      const logger: LoggerService = this.logger;

      if (!logger) {
        throw new Error('no Logger dependency');
      }

      try {
        this.checkAppMode(message);
        const response = await originalFn.call(
          this,
          message,
          normalizedOptions,
          ...args,
        );
        return response;
      } catch (error) {
        handleError.call(this, message, normalizedOptions, error);
      }
    };

    return descriptor;
  };
};
