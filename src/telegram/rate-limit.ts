import { limit } from "@grammyjs/ratelimiter";
import { Context } from './types';

const limitConfig = {
  timeFrame: 3000,
  limit: 1,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onLimitExceeded: () => {},
  keyGenerator: (ctx: Context) => {
    const keys = [];
    const fromId = ctx?.from?.id;
    const chatId = ctx?.chat?.id;

    if (fromId) {
      keys.push(fromId);
    }

    if (chatId) {
      keys.push(chatId);
    }

    return keys.join('-');
  },
};

export const rateLimitMiddleware = limit(limitConfig);
