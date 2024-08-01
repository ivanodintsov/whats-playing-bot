import { CLIENT_PROVIDES, CLIENT_UNIQUE_PROVIDES } from 'src/constants';

export enum MESSENGER_TYPES {
  TELEGRAM = 'telegram-bot-1',
  TELEGRAM_2 = 'telegram-bot-2',
}

export enum CHAT_TYPES {
  PRIVATE = 'PRIVATE',
}

export enum MESSAGE_TYPES {
  MESSAGE = 'MESSAGE',
  ACTION = 'ACTION',
  SEARCH = 'SEARCH',
  SERVICE = 'SERVICE',
}

export class Chat {
  id: string;
  type: CHAT_TYPES;
}

export class User {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
}

export class MessageContent {
  text?: string;
}

export abstract class Message extends MessageContent {
  abstract readonly messengerType: MESSENGER_TYPES;
  abstract readonly provider: CLIENT_PROVIDES;
  abstract readonly providerUnique: CLIENT_UNIQUE_PROVIDES;
  abstract readonly type: MESSAGE_TYPES;

  id: string;

  chat?: Chat;
  from: User;

  offset?: string;
}
