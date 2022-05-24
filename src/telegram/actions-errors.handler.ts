import { ConfigService } from '@nestjs/config';
import { Context } from './types';
import { PREMIUM_REQUIRED } from 'src/spotify/constants';

export const ActionsErrorsHandler = function() {
  return function(
    targetClass: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(ctx: Context) => Promise<void>>,
  ) {
    const originalFn = descriptor.value;

    descriptor.value = async function(ctx: Context) {
      const appConfig: ConfigService = this.appConfig;
      try {
        const response = await originalFn.call(this, ctx);
        return response;
      } catch (error) {
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
            await ctx.answerCbQuery('No active devices 😒');
            break;
        }
      }
    };

    return descriptor;
  };
};
