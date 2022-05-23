import { ConfigService } from '@nestjs/config';
import { Context } from 'telegraf';
import { PREMIUM_REQUIRED } from 'src/spotify/constants';

export const CommandsErrorsHandler = function(
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
      const url = `https://t.me/${appConfig.get<string>('TELEGRAM_BOT_NAME')}`;
      switch (error.message) {
        case 'NO_TOKEN':
          this.bot.telegram.sendMessage(
            ctx.chat.id,
            `You should connect Spotify account in a [private messages](${url}) with /start command`,
            {
              parse_mode: 'Markdown',
            },
          );
          break;

        case 'NO_TRACK_URL':
          this.bot.telegram.sendMessage(
            ctx.chat.id,
            'Nothing is playing right now ☹️',
          );
          break;

        case 'PRIVATE_ONLY':
          this.bot.telegram.sendMessage(
            ctx.chat.id,
            `The command for [private messages](${url}) only`,
            {
              parse_mode: 'Markdown',
            },
          );
          break;

        case 'SPOTIFY_API_INVALID_GRANT':
          this.bot.telegram.sendMessage(
            ctx.chat.id,
            `You should reconnect Spotify account in a [private messages](${url}) with /start command`,
            {
              parse_mode: 'Markdown',
            },
          );
          break;

        case PREMIUM_REQUIRED:
          this.bot.telegram.sendMessage(
            ctx.chat.id,
            `This command requires Spotify Premium ☹️`,
            {
              parse_mode: 'Markdown',
            },
          );
          break;

        default:
          console.log(error.message);
          throw error;
      }
    }
  };

  return descriptor;
};
