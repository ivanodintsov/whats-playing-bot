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

export type TSenderMessage = TMessageBase & {
  text: string;
  buttons?: TButton[][];
};

export abstract class Sender {
  abstract sendMessage(message: TSenderMessage): Promise<any>;
  abstract sendSignUpMessage(message: Message, token: string): Promise<any>;
  abstract sendUserExistsMessage(message: Message): Promise<any>;
}
