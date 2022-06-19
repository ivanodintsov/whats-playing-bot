import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Telegram } from 'telegraf';
import { PREMIUM_REQUIRED } from 'src/spotify/constants';
import { Message } from 'typegram';
import { PrivateOnlyError } from './domain/errors';
import { Context } from './types';

export const CommandsErrorsHandler = function() {
  return function(
    targetClass: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<
      (ctx: Message | Context) => Promise<void>
    >,
  ) {
    const originalFn = descriptor.value;

    async function handleError(ctx: Context, error: Error) {
      const appConfig: ConfigService = this.appConfig;
      const logger: Logger = this.logger;
      const telegram: Telegram = this.bot.telegram;

      const url = `https://t.me/${appConfig.get<string>('TELEGRAM_BOT_NAME')}`;

      try {
        if (error instanceof PrivateOnlyError) {
          await this.botService.onPrivateOnly(ctx.domainMessage);
          return;
        }

        switch (error.message) {
          case 'NO_TOKEN':
            await telegram.sendMessage(
              ctx.chat.id,
              `You should connect Spotify account in a [private messages](${url}) with /start command`,
              {
                parse_mode: 'Markdown',
              },
            );
            break;

          case 'NO_TRACK_URL':
            await telegram.sendMessage(
              ctx.chat.id,
              'Nothing is playing right now ☹️',
            );
            break;

          case 'PRIVATE_ONLY':
            await telegram.sendMessage(
              ctx.chat.id,
              `The command for [private messages](${url}) only`,
              {
                parse_mode: 'Markdown',
              },
            );
            break;

          case 'SPOTIFY_API_INVALID_GRANT':
            await telegram.sendMessage(
              ctx.chat.id,
              `You should reconnect Spotify account in a [private messages](${url}) with /start command`,
              {
                parse_mode: 'Markdown',
              },
            );
            break;

          case PREMIUM_REQUIRED:
            await telegram.sendMessage(
              ctx.chat.id,
              `This command requires Spotify Premium ☹️`,
              {
                parse_mode: 'Markdown',
              },
            );
            break;

          default:
            logger.error(error.message, error.stack);
        }
      } catch (error) {
        logger.error(error.message, error);
      }
    }

    descriptor.value = async function(ctx: Message | Context, ...args: any[]) {
      const logger: Logger = this.logger;

      if (!logger) {
        throw new Error('no Logger dependency');
      }

      try {
        const response = await originalFn.call(this, ctx, ...args);
        return response;
      } catch (error) {
        handleError.call(this, ctx, error);
      }
    };

    return descriptor;
  };
};
