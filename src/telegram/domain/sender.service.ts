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

export enum SEARCH_ITEM_TYPES {
  SONG = 'SONG',
  TEXT = 'TEXT',
}

export type TSenderSearchItemBase = {
  action: string;
  type: SEARCH_ITEM_TYPES;
};

export type TSenderSongSearchItem = TSenderSearchItemBase & {
  type: SEARCH_ITEM_TYPES.SONG;
  image: TImage;
  title: string;
  description: string;
  message: TSenderMessageContent;
};

export type TSenderTextSearchItem = TSenderSearchItemBase & {
  type: SEARCH_ITEM_TYPES.TEXT;
  title: string;
  description: string;
  image?: TImage;
  message: TSenderMessageContent;
};

export type TSenderSearchItem = TSenderSongSearchItem | TSenderTextSearchItem;

export type TSenderSearchMessage = {
  id: string | number;
  items: TSenderSearchItem[];
};

export type TSenderSearchOptions = {
  nextOffset?: number | string;
};

export abstract class Sender {
  abstract sendMessage(message: TSenderMessage): Promise<any>;
  abstract sendShare(message: TSenderMessage): Promise<any>;
  abstract updateShare(
    message: TSenderMessageContent,
    messageToUpdate: Message,
  ): Promise<any>;
  abstract sendSearch(
    message: TSenderSearchMessage,
    options?: TSenderSearchOptions,
  ): Promise<any>;
  abstract answerToAction(message: TSenderMessage): Promise<any>;
}
