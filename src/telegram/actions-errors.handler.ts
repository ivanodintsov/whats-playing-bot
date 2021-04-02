import { ConfigService } from '@nestjs/config';
import { Context } from 'nestjs-telegraf';
import { PREMIUM_REQUIRED } from 'src/spotify/constants';

export const ActionsErrorsHandler = function (targetClass: any, propertyKey: string, descriptor: TypedPropertyDescriptor<(ctx: Context) => Promise<void>>) {
  const originalFn = descriptor.value;

  descriptor.value = async function (ctx: Context) {
    const appConfig: ConfigService = this.appConfig;
    try {
      const response = await originalFn.call(this, ctx);
      return response;
    } catch (error) {
      switch (error.message) {
        case 'NO_TOKEN':
          ctx.answerCbQuery('You should connect Spotify account in a private messages', false, {
            url: `t.me/${appConfig.get<string>('TELEGRAM_BOT_NAME')}?start=sign_up_pm`,
          });
          break;

        case 'NO_TRACK_URL':
          ctx.answerCbQuery('Nothing is playing right now ☹️');
          break;

        case PREMIUM_REQUIRED:
          ctx.answerCbQuery('This command requires Spotify Premium ☹️');
          break;

        default:
          ctx.answerCbQuery('No active devices 😒');
          break;
      }
    }
  }

  return descriptor;
};
