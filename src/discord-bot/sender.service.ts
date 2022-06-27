import { Injectable, Inject } from '@nestjs/common';
import { Telegraf, Types } from 'telegraf';
import { ExtraPhoto, ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import {
  InlineKeyboardButton,
  InlineQueryResult,
  KeyboardButton,
} from 'typegram';
import { Logger } from 'src/logger';
import { ACTIONS, MESSAGES_SERVICE } from 'src/bot-core/constants';
import { Message, MESSAGE_TYPES } from 'src/bot-core/message/message';
import { AbstractMessagesService } from 'src/bot-core/messages.service';
import {
  Sender,
  TButton,
  TSenderMessage,
  TSenderMessageContent,
  TSenderSearchMessage,
  TSenderSearchOptions,
} from 'src/bot-core/sender.service';
import { DiscordMessage } from './message/message';
import {
  Client,
  MessageFlags,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
} from 'discord.js';
import { ShareSongData } from 'src/bot-core/types';

@Injectable()
export class DiscordSender extends Sender {
  private readonly logger = new Logger(DiscordSender.name);

  constructor(
    @Inject(MESSAGES_SERVICE)
    protected messagesService: AbstractMessagesService,

    private readonly bot: Client,
  ) {
    super();
  }

  async sendMessage(message: TSenderMessage, messageRef: DiscordMessage) {
    try {
      const channel = await this.bot.channels.fetch(
        messageRef.chat.id as string,
      );

      if (channel.isText()) {
        const components =
          message.buttons && this.transformButton(message.buttons);

        const response = await channel.messages.edit(messageRef.id, {
          content: message.text,
          components,
        });

        // console.log(response);
        return new DiscordMessage(channel, response);
      }
    } catch (error) {
      console.log(error);
    }
  }

  async sendMessageToChat(
    channelId: string,
    messageContent: TSenderMessageContent,
  ) {
    try {
      const channel = await this.bot.channels.fetch(channelId);

      if (channel.isText()) {
        const components =
          messageContent.buttons &&
          this.transformButton(messageContent.buttons);

        const response = await channel.send({
          content: messageContent.text,
          components,
        });

        return new DiscordMessage(channel, response);
      }
    } catch (error) {
      console.log(error);
    }
  }

  async sendPhoto(message: TSenderMessage, messageRef: DiscordMessage) {}

  private createSongEmbed(
    message: TSenderMessageContent<{ data: ShareSongData }>,
  ) {
    const data = message.data.data;

    const embed = new MessageEmbed()
      .setColor('#1feb6a')
      .setTitle(data.track.name)
      .setDescription(data.track.artists)
      .setImage(message.image.url);

    return embed;
  }

  async sendShare(
    message: TSenderMessageContent<{ data: ShareSongData }>,
    messageRef?: DiscordMessage,
  ) {
    const data = message.data.data;
    const channel = await this.bot.channels.fetch(messageRef.chat.id as string);

    if (channel.isText()) {
      const buttons = this.transformButton(message.buttons);

      const songEmbed = this.createSongEmbed(message);

      const response = await channel.messages.edit(messageRef.id, {
        content: message.text,
        components: [...buttons],
        flags: [MessageFlags.FLAGS.CROSSPOSTED],
        embeds: [songEmbed],
      });

      return new DiscordMessage(channel, response);
    }
  }

  private transformButton(buttons: TButton[][]): MessageActionRow[] {
    return buttons.map(buttons => {
      const row = new MessageActionRow();

      buttons.forEach(button => {
        let keyboardButton: MessageButton;

        if ('url' in button) {
          keyboardButton = new MessageButton()
            .setLabel(button.text)
            .setURL(button.url)
            .setStyle('LINK');
        } else if ('callbackData' in button) {
          keyboardButton = new MessageButton()
            .setLabel(button.text)
            .setCustomId(button.callbackData)
            .setStyle('PRIMARY');
        }

        if (keyboardButton) {
          row.addComponents(keyboardButton);
        }
      });

      return row;
    });
  }

  async updateShare(
    message: TSenderMessageContent<{ data: ShareSongData }>,
    messageRef: DiscordMessage,
  ) {
    const channel = await this.bot.channels.fetch(messageRef.chat.id as string);

    if (channel.isText()) {
      const buttons = this.transformButton(message.buttons);

      const songEmbed = this.createSongEmbed(message);

      const response = await channel.messages.edit(messageRef.id, {
        content: message.text,
        components: [...buttons],
        flags: [MessageFlags.FLAGS.CROSSPOSTED],
        embeds: [songEmbed],
      });

      return new DiscordMessage(channel, response);
    }
  }

  async sendSearch(
    message: TSenderSearchMessage,
    messageRef: DiscordMessage,
    options?: TSenderSearchOptions,
  ) {}

  async answerToAction(message: TSenderMessage, messageRef: DiscordMessage) {
    const channel = await this.bot.channels.fetch(messageRef.chat.id as string);

    if (channel.isText()) {
      const messageInstance = await channel.messages.fetch(messageRef.id);

      // await messageInstance.({
      //   content: message.text,
      // });

      // return new DiscordMessage(channel, response);
    }
  }

  async enableKeyboard(messageToSend: TSenderMessage, message: Message) {}

  async disableKeyboard(messageToSend: TSenderMessage, message: Message) {}

  async sendUnlinkService(
    messageToSend: TSenderMessage,
    messageRef: DiscordMessage,
  ) {
    await this.sendMessage(messageToSend, messageRef);
  }
}
