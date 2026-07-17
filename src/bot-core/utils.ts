import { Maybe } from 'src/typings';
import { DEFAULT_BOT_METHOD_OPTIONS } from './constants';
import { BotMethodOptions } from './types';

export const normalizeBotMethodOptions = (
  options: Maybe<BotMethodOptions>,
) => ({
  ...DEFAULT_BOT_METHOD_OPTIONS,
  ...(options || {}),
});
