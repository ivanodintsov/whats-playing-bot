import { Message } from './message/message';
import { ShareSongConfig, ShareSongData } from './types';

export type TMessageBase = {
  chatId: number | string;
};

export type TButtonText = {
  text: string;
};

export type TButtonLink = TButtonText & {
  url: string;
};

export type TButtonCallback = TButtonText & {
  callbackData: string;
};

export type TButton = TButtonLink | TButtonCallback;

export type TImage = {
  height?: number;
  width?: number;
  url: string;
};

export type TSenderMessageContent = {
  text: string;
  buttons?: TButton[][];
  parseMode?: 'Markdown';
  image?: TImage;
};

export type TSenderMessage = TMessageBase & TSenderMessageContent;

export abstract class Sender {
  abstract sendMessage(message: TSenderMessage): Promise<any>;
  abstract sendSignUpMessage(message: Message, token: string): Promise<any>;
  abstract sendUserExistsMessage(message: Message): Promise<any>;
  abstract sendPrivateOnlyMessage(message: Message): Promise<any>;
  abstract sendShare(
    message: Message,
    data: ShareSongData,
    config: ShareSongConfig,
  ): Promise<any>;
  abstract updateShare(
    message: Message,
    messageToUpdate: Message,
    { track }: ShareSongData,
    config: ShareSongConfig,
  ): Promise<any>;
}
