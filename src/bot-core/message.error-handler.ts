import { LoggerService } from '@nestjs/common';
import {
  MaintenanceError,
  PrivateOnlyError,
  UserNotExistsError,
} from './errors';
import { Sender } from './sender.service';
import { Message } from './message/message';
import {
  ExpiredMusicServiceTokenError,
  NoMusicServiceError,
  NoServiceSubscriptionError,
  NoTrackError,
} from 'src/errors';
import { AbstractBotService } from './bot.service';
import { NoActiveDeviceError } from 'src/errors/NoActiveDeviceError';
import { BotMethodOptions } from './types';
import { Maybe } from 'src/typings';
import { normalizeBotMethodOptions } from './utils';

export const MessageErrorsHandler = function () {
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
          await handleError.call(this, message, options, error.errors[0]);
          return;
        }

        if (error instanceof PrivateOnlyError) {
          await sender.onPrivateOnly(message);
        } else if (
          error instanceof NoMusicServiceError ||
          error instanceof UserNotExistsError
        ) {
          await sender.sendNoConnectedMusicService(message);
        } else if (error instanceof NoTrackError) {
          await sender.sendNoTrack(message);
        } else if (error instanceof ExpiredMusicServiceTokenError) {
          await sender.sendMusicServiceTokenExpired(message, error);
        } else if (error instanceof NoActiveDeviceError) {
          await sender.sendNoActiveDevices(message);
        } else if (error instanceof NoServiceSubscriptionError) {
          await sender.sendNoMusicServiceSubscription(message);
        } else if (error instanceof MaintenanceError) {
          await sender.sendUnderMaintenance(message);
        } else {
          if (error instanceof Error) {
            logger.debug(error.message, error.stack, error, message);
          } else {
            logger.debug(error);
          }
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
      options: Maybe<BotMethodOptions>,
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
