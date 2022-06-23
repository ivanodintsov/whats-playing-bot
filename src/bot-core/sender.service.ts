import { ACTIONS } from './constants';
import { Message } from './message/message';
import { AbstractMessagesService } from './messages.service';

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

export type TButton = TButtonText | TButtonLink | TButtonCallback;

export type TImage = {
  height?: number;
  width?: number;
  url: string;
};

export type TSenderMessageContent<T = any> = {
  text: string;
  buttons?: TButton[][];
  parseMode?: 'Markdown';
  image?: TImage;
  description?: string;
  data?: T;
};

export type TSenderMessage = TMessageBase & TSenderMessageContent;

export enum SEARCH_ITEM_TYPES {
  SONG = 'SONG',
  TEXT = 'TEXT',
  BUTTON = 'BUTTON',
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

export type TSenderButtonSearchItem = TSenderSearchItemBase & {
  type: SEARCH_ITEM_TYPES.BUTTON;
  title: string;
};

export type TSenderTextSearchItem = TSenderSearchItemBase & {
  type: SEARCH_ITEM_TYPES.TEXT;
  title: string;
  description?: string;
  image?: TImage;
  message: TSenderMessageContent;
};

export type TSenderSearchItem =
  | TSenderSongSearchItem
  | TSenderTextSearchItem
  | TSenderButtonSearchItem;

export type TSenderSearchMessage = {
  id: string | number;
  items: TSenderSearchItem[];
};

export type TSenderSearchOptions = {
  nextOffset?: number | string;
};

export abstract class Sender {
  protected abstract messagesService: AbstractMessagesService;

  abstract sendMessage(
    message: TSenderMessage,
    messageRef: Message,
  ): Promise<any>;
  abstract sendMessageToChat(
    chatId: TSenderMessage['chatId'],
    messageContent: TSenderMessageContent,
  ): Promise<any>;
  abstract sendShare(
    message: TSenderMessage,
    messageRef: Message,
  ): Promise<any>;
  abstract updateShare(
    message: TSenderMessageContent,
    messageRef: Message,
  ): Promise<any>;
  abstract sendSearch(
    message: TSenderSearchMessage,
    messageRef: Message,
    options?: TSenderSearchOptions,
  ): Promise<any>;
  abstract answerToAction(
    message: TSenderMessage,
    messageRef: Message,
  ): Promise<any>;
  abstract enableKeyboard(
    message: TSenderMessage,
    messageRef: Message,
  ): Promise<any>;
  abstract disableKeyboard(
    message: TSenderMessage,
    messageRef: Message,
  ): Promise<any>;
  abstract sendUnlinkService(
    message: TSenderMessage,
    messageRef: Message,
  ): Promise<any>;

  async onPrivateOnly(message: Message) {
    const messageData = this.messagesService.privateOnlyMessage(message);

    await this.sendMessage(
      {
        chatId: message.chat.id,
        ...messageData,
      },
      message,
    );
  }

  async sendConnectedSuccessfully(chatId: TSenderMessage['chatId']) {
    const messageData = this.messagesService.connectedSuccessfullyMessage();

    await this.sendMessageToChat(chatId, messageData);
  }

  async sendSearchSignUp(message: Message) {
    await this.sendSearch(
      {
        id: message.id,
        items: [
          {
            type: SEARCH_ITEM_TYPES.BUTTON,
            action: ACTIONS.SIGN_UP,
            title: 'Sign up',
          },
        ],
      },
      message,
    );
  }

  async sendSearchNoTrack(message: Message) {
    await this.sendSearch(
      {
        id: message.id,
        items: [this.messagesService.noTrackSearchItem(message)],
      },
      message,
    );
  }

  async sendNoTrack(message: Message) {
    const messageData = this.messagesService.noTrackMessage(message);

    await this.sendMessage(
      {
        chatId: message.chat.id,
        ...messageData,
      },
      message,
    );
  }

  async sendNoConnectedMusicService(message: Message) {
    const messageData = this.messagesService.noConnectedMusicServiceMessage(
      message,
    );

    await this.sendMessage(
      {
        chatId: message.chat.id,
        ...messageData,
      },
      message,
    );
  }

  async sendNoMusicServiceSubscription(message: Message) {
    const messageData = this.messagesService.noMusicServiceSubscriptionMessage(
      message,
    );

    await this.sendMessage(
      {
        chatId: message.chat.id,
        ...messageData,
      },
      message,
    );
  }

  async sendExpiredMusicService(message: Message) {
    const messageData = this.messagesService.expiredMusicServiceMessage(
      message,
    );

    await this.sendMessage(
      {
        chatId: message.chat.id,
        ...messageData,
      },
      message,
    );
  }

  async signUpActionAnswer(message: Message) {
    const messageData = this.messagesService.getSignUpActionAnswerMessage(
      message,
    );

    await this.answerToAction(
      {
        chatId: message.id,
        ...messageData,
      },
      message,
    );
  }

  async noTrackActionAnswer(message: Message) {
    const messageData = this.messagesService.getNoTrackAnswerMessage(message);

    await this.answerToAction(
      {
        chatId: message.id,
        ...messageData,
      },
      message,
    );
  }

  async noMusicServiceSubscriptionActionAnswer(message: Message) {
    const messageData = this.messagesService.getNoMusicServiceSubscriptionActionAnswer(
      message,
    );

    await this.answerToAction(
      {
        chatId: message.id,
        ...messageData,
      },
      message,
    );
  }

  async noActiveDevicesActionAnswer(message: Message) {
    const messageData = this.messagesService.getNoActiveDevicesActionAnswer(
      message,
    );

    await this.answerToAction(
      {
        chatId: message.id,
        ...messageData,
      },
      message,
    );
  }
}
