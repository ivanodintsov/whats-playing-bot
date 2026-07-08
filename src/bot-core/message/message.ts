import { CLIENT_PROVIDES, CLIENT_UNIQUE_PROVIDES } from 'src/constants';

export enum CHAT_TYPES {
  PRIVATE = 'PRIVATE',
  GROUP = 'group',
  SUPEGROUP = 'SUPERGROUP',
  CHANNEL = 'CHANNEL',
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
  abstract readonly provider: CLIENT_PROVIDES;
  abstract readonly providerUnique: CLIENT_UNIQUE_PROVIDES;
  abstract readonly type: MESSAGE_TYPES;

  id: string;

  chat?: Chat;
  chatType: CHAT_TYPES;
  from: User;

  offset?: string;

  message?: Message;
}

export class DumbMessage extends Message {
  readonly provider: CLIENT_PROVIDES = CLIENT_PROVIDES.TELEGRAM;
  readonly providerUnique = CLIENT_UNIQUE_PROVIDES.TELEGRAM;
  readonly type: MESSAGE_TYPES = MESSAGE_TYPES.MESSAGE;

  id: string;

  chat?: Chat;
  from: User;

  offset?: string;
}
