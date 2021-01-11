import { Injectable } from '@nestjs/common';
import { InjectBot, TelegrafProvider } from 'nestjs-telegraf';

@Injectable()
export class ChannelPostingService {
  private CHATS: number[] = [-1001187343299];

  constructor(
    @InjectBot() private readonly bot: TelegrafProvider,
  ) {}

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
        reply_markup: data.message.reply_markup,
        caption: `${data.message.from.first_name} is listening now:
*${data.song.name} - ${data.song.artists}*
[Listen on Spotify](${data.song.url})`,
      });
    } catch (error) {
      console.log(error);
    }
  }
}
