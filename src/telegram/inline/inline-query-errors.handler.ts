import { Logger } from 'src/logger';
import { InlineQuery, InlineQueryResult } from 'typegram';
import { Telegram, Types } from 'telegraf';
import { TelegramMessagesService } from '../telegram-messages.service';

type InlineError = {
  error: Error;
  query: InlineQuery;
};

export const InlineQueryErrorHandler = function() {
  return function(
    targetClass: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(ctx: InlineQuery) => Promise<void>>,
  ) {
    const originalFn = descriptor.value;

    async function handleError(ctx: InlineQuery, inlineError: InlineError) {
      const logger: Logger = this.logger;
      const telegram: Telegram = this.bot.telegram;
      const telegramMessagesService: TelegramMessagesService = this
        .telegramMessagesService;

      try {
        const error = inlineError.error;
        const query = inlineError.query;
        const results: InlineQueryResult[] = [];

        const options: Types.ExtraAnswerInlineQuery = {
          cache_time: 0,
        };

        switch (error.message) {
          case 'NO_TOKEN':
            options.switch_pm_text = 'Sign up';
            options.switch_pm_parameter = 'sign_up_pm';
            break;

          case 'NO_TRACK_URL':
            results.push(telegramMessagesService.createNotPlayingInline());
            break;

          default:
            logger.error(error.message);
            break;
        }

        await telegram.answerInlineQuery(query.id, results, options);
      } catch (error) {
        logger.error(error.message);
      }
    }

    descriptor.value = async function(ctx: InlineQuery) {
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
