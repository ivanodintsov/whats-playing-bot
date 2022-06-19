export enum MESSENGER_TYPES {
  TELEGRAM = 'telegram',
}

export enum CHAT_TYPES {
  private = 'private',
}

export class Chat {
  id: number;
  type: CHAT_TYPES;
}

export class User {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
}

export class MessageContent {
  text?: string;
}

export abstract class Message extends MessageContent {
  abstract messengerType: MESSENGER_TYPES;

  id: string | number;

  chat: Chat;
  from: User;
}
