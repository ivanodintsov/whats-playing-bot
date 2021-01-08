import { ConfigService } from '@nestjs/config';
import { Context } from 'nestjs-telegraf';

export const CommandsErrorsHandler = function (targetClass: any, propertyKey: string, descriptor: TypedPropertyDescriptor<(ctx: Context) => Promise<void>>) {
  const originalFn = descriptor.value;

  descriptor.value = async function (ctx: Context) {
    const appConfig: ConfigService = this.appConfig;
    try {
      const response = await originalFn.call(this, ctx);
      return response;
    } catch (error) {
      switch (error.message) {
        case 'NO_TOKEN':
          const url = `https://t.me/${appConfig.get<string>('TELEGRAM_BOT_NAME')}`
          ctx.reply(`You should connect Spotify account in a [private messages](${url}) with /start command`, {
            parse_mode: 'Markdown',
          });
          break;

        case 'NO_TRACK_URL':
          ctx.reply('Nothing is playing right now ☹️');
          break;

        default:
          break;
      }
    }
  }

  return descriptor;
};
