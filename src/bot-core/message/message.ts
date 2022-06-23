export enum MESSENGER_TYPES {
  TELEGRAM = 'telegram-bot-1',
  TELEGRAM_2 = 'telegram-bot-2',
  DISCORD = 'discord',
}

export enum CHAT_TYPES {
  PRIVATE = 'PRIVATE',
}

export enum MESSAGE_TYPES {
  MESSAGE = 'MESSAGE',
  ACTION = 'ACTION',
  SEARCH = 'SEARCH',
}

export class Chat {
  id: number | string;
  type: CHAT_TYPES;
}

export class User {
  id: number | string;
  firstName: string;
  lastName?: string;
  username?: string;
}

export class MessageContent {
  text?: string;
}

export abstract class Message extends MessageContent {
  abstract readonly messengerType: MESSENGER_TYPES;
  abstract readonly type: MESSAGE_TYPES;

  id: string | number;
  chat?: Chat;
  from: User;
  offset?: string | number;
}
