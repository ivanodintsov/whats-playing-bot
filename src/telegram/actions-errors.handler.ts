import { ConfigService } from '@nestjs/config';
import { Context } from './types';
import { PREMIUM_REQUIRED } from 'src/spotify/constants';
import { Logger } from 'src/logger';

export const ActionsErrorsHandler = function() {
  return function(
    targetClass: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(ctx: Context) => Promise<void>>,
  ) {
    const originalFn = descriptor.value;

    async function handleError(ctx: Context, error: Error) {
      const appConfig: ConfigService = this.appConfig;
      const logger: Logger = this.logger;

      try {
        switch (error.message) {
          case 'NO_TOKEN':
            await ctx.answerCbQuery(
              'You should connect Spotify account in a private messages',
              {
                url: `t.me/${appConfig.get<string>(
                  'TELEGRAM_BOT_NAME',
                )}?start=sign_up_pm`,
              },
            );
            break;

          case 'NO_TRACK_URL':
            await ctx.answerCbQuery('Nothing is playing right now ☹️');
            break;

          case PREMIUM_REQUIRED:
            await ctx.answerCbQuery('This command requires Spotify Premium ☹️');
            break;

          default:
            logger.error(error.message);
            await ctx.answerCbQuery('No active devices 😒');
            break;
        }
      } catch (error) {
        logger.error(error.message);
      }
    }

    descriptor.value = async function(ctx: Context) {
      const logger: Logger = this.logger;

      if (!logger) {
        throw new Error('no Logger dependency');
      }

      try {
        const response = await originalFn.call(this, ctx);
        return response;
      } catch (error) {
        handleError.call(this, ctx, error);
      }
    };

    return descriptor;
  };
};
