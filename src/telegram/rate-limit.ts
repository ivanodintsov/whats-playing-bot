import * as rateLimit from 'telegraf-ratelimit';
import { Context } from './types';

const limitConfig = {
  window: 3000,
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

export const rateLimitMiddleware = rateLimit(limitConfig);
