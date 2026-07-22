import { Sender } from './sender.service';
import { Message } from './message/message';
import {
  ExpiredMusicServiceTokenError,
  NoMusicServiceError,
  NoTrackError,
} from 'src/errors';
import { MaintenanceError, UserNotExistsError } from './errors';
import { BotMethodOptions } from './types';
import { AbstractBotService } from './bot.service';
import { LoggerService } from '@nestjs/common';
import { Maybe } from 'src/typings';
import { normalizeBotMethodOptions } from './utils';

export const SearchErrorHandler = function () {
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
        if (
          error instanceof NoMusicServiceError ||
          error instanceof UserNotExistsError
        ) {
          await sender.sendSearchSignUp(message);
        } else if (error instanceof ExpiredMusicServiceTokenError) {
          await sender.sendSearchMusicServiceTokenExpired(message, error);
        } else if (error instanceof NoTrackError) {
          await sender.sendSearchNoTrack(message);
        } else if (error instanceof MaintenanceError) {
          await sender.sendSearchMaintenance(message);
        } else {
          logger.debug(error);
        }
      } catch (error) {
        logger.error(error);
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
