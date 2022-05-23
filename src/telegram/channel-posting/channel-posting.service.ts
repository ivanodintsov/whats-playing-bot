import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import * as R from 'ramda';

@Injectable()
export class ChannelPostingService {
  private CHATS: number[] = [-1001187343299];

  constructor(@InjectBot() private readonly bot: Telegraf) {}

  async sendSong(data) {
    for (let i = 0; i < this.CHATS.length; i++) {
      const chatId = this.CHATS[i];
      await this.postSongMessage(chatId, data);
    }
  }

  private async postSongMessage(chatId, data) {
    try {
      await this.bot.telegram.sendPhoto(chatId, data.message.media, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: R.drop(1, data.message.reply_markup.inline_keyboard),
        },
        caption: `${data.message.from.first_name} is listening now: *${data.song.name} - ${data.song.artists}*`,
      });
    } catch (error) {
      console.log(error);
    }
  }
}
