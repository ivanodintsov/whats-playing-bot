import { Message } from './message/message';

export type TMessageBase = {
  chatId: number;
};

export type TButtonText = {
  text: string;
};

export type TButtonLink = TButtonText & {
  url: string;
};

export type TButton = TButtonLink;

export type TSenderMessageContent = {
  text: string;
  buttons?: TButton[][];
};

export type TSenderMessage = TMessageBase & TSenderMessageContent;

export abstract class Sender {
  abstract sendMessage(message: TSenderMessage): Promise<any>;
  abstract sendSignUpMessage(message: Message, token: string): Promise<any>;
  abstract sendUserExistsMessage(message: Message): Promise<any>;
  abstract sendPrivateOnlyMessage(message: Message): Promise<any>;
}
