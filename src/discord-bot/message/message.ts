import { Context } from 'telegraf';
import {
  Message,
  MESSENGER_TYPES,
  CHAT_TYPES,
  Chat,
  User,
  MESSAGE_TYPES,
} from 'src/bot-core/message/message';
import { Message as DiscordBaseMessage, AnyChannel } from 'discord.js';
import { APIMessage } from 'discord-api-types/v10';
import { MessageButton, Interaction, Constants } from 'discord.js-light';

export class DiscordMessage extends Message {
  readonly messengerType: MESSENGER_TYPES = MESSENGER_TYPES.DISCORD;
  readonly type: MESSAGE_TYPES = MESSAGE_TYPES.MESSAGE;

  id: string;

  // rawMessage: interaction;
  component: MessageButton;

  constructor(
    channel: AnyChannel,
    message: APIMessage | DiscordBaseMessage,
    component?: MessageButton,
  ) {
    super();

    this.id = message.id;

    this.from = new User();

    this.chat = new Chat();

    const channelType: number = Constants.ChannelTypes[channel.type];

    if (channelType === Constants.ChannelTypes.DM) {
      this.chat.type = CHAT_TYPES.PRIVATE;
    }

    if (component && 'customId' in component) {
      this.type = MESSAGE_TYPES.ACTION;
      this.id = message.id;
      this.text = component.customId;
    }

    this.from.id = message?.interaction?.user?.id;
    this.from.firstName = message?.interaction?.user?.username;
    this.chat.id = channel.id;
  }
}
