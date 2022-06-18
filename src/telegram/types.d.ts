import { Context as TelegrafContext } from 'telegraf';
import { TelegramMessage } from './message/message';

export interface Context extends TelegrafContext {
  domainMessage: TelegramMessage;
}

export interface CurrentTrack {
  title: string;
  name: string;
  artists: string;
  url: string;
  thumb_url: string;
  thumb_width: number;
  thumb_height: number;
  message_text: string;
  parse_mode: string;
  uri: string;
}
