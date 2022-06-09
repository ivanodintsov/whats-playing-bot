import { Injectable } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { TelegramMessagesService } from '../telegram-messages.service';
import { TrackEntity } from 'src/domain/Track';
import { User } from 'typegram';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import { Logger } from 'src/logger';
import { InjectModuleBot } from '../decorators/inject-bot';

@Injectable()
export class ChannelPostingService {
  private CHATS: number[] = [-1001187343299];
  private readonly logger = new Logger(ChannelPostingService.name);

  constructor(
    @InjectModuleBot() private readonly bot: Telegraf,
    private readonly telegramMessageService: TelegramMessagesService,

    private readonly songWhip: SongWhipService,
  ) {}

  async sendSong(data) {
    for (let i = 0; i < this.CHATS.length; i++) {
      const chatId = this.CHATS[i];
      await this.postSongMessage(chatId, data);
    }
  }

  private async postSongMessage(
    chatId,
    { track, from }: { track: TrackEntity; from: User },
  ) {
    try {
      const songWhip = await this.songWhip.getSong({
        url: track.url,
        country: 'us',
      });
      const messageData = this.telegramMessageService.createCurrentPlaying({
        track,
        from,
        songWhip,
        anonymous: true,
        control: false,
        donate: false,
      });

      await this.bot.telegram.sendPhoto(chatId, messageData.thumb_url, {
        parse_mode: 'Markdown',
        reply_markup: messageData.reply_markup,
        caption: messageData.message,
      });
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }
}
