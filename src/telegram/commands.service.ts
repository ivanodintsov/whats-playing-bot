import { Injectable } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { ChosenInlineResult, Message, User } from 'typegram';
import { ConfigService } from '@nestjs/config';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import { CommandsErrorsHandler } from './commands-errors.handler';
import { SpotifyPlaylistService } from 'src/spotify/playlist.service';
import { Queue } from 'bull';
import { Logger } from 'src/logger';
import { TelegramService } from './telegram.service';
import { SpotifyService } from 'src/spotify/spotify.service';
import { TelegramMessagesService } from './telegram-messages.service';
import { TrackEntity } from 'src/domain/Track';
import { SongWhip } from 'src/schemas/song-whip.schema';
import { InjectModuleQueue } from './decorators';
import { InjectModuleBot } from './decorators/inject-bot';

type Config = {
  control?: boolean;
  loading?: boolean;
};

@Injectable()
export class CommandsService {
  private readonly logger = new Logger(CommandsService.name);

  constructor(
    private readonly appConfig: ConfigService,
    @InjectModuleBot() private readonly bot: Telegraf,
    private readonly songWhip: SongWhipService,
    private readonly spotifyPlaylist: SpotifyPlaylistService,
    @InjectModuleQueue() private readonly telegramProcessorQueue: Queue,
    private readonly telegramService: TelegramService,
    private readonly spotifyService: SpotifyService,
    private readonly telegramMessagesService: TelegramMessagesService,
  ) {}

  private async addToPlaylist(
    message: Message,
    song: TrackEntity,
    songWhip: SongWhip,
  ) {
    try {
      const newSong = await this.spotifyPlaylist.addSong({
        tg_user_id: message.from.id,
        chat_id: message.chat.id,
        name: song.name,
        artists: song.artists,
        url: song.url,
        uri: `${song.id}`,
        spotifyImage: song.thumb_url,
        image: songWhip.image,
      });
      return newSong;
    } catch (error) {}
  }

  async updateSearch(
    message: Message | ChosenInlineResult,
    from: User,
    song: TrackEntity,
    config?: Config,
  ) {
    const songWhip = await this.songWhip.getSong({
      url: song.url,
      country: 'us',
    });

    const messageData = this.telegramMessagesService.createSong({
      from: from,
      track: song,
      songWhip: songWhip,
      control: config?.control,
    });

    const inlineMessageId = (message as ChosenInlineResult).inline_message_id;
    const messageId = (message as Message).message_id;
    const chatId = (message as Message).chat?.id;

    try {
      await this.bot.telegram.editMessageMedia(
        chatId,
        messageId,
        inlineMessageId,
        {
          type: 'photo',
          media: messageData.thumb_url,
          caption: messageData.message,
          parse_mode: messageData.parse_mode,
        },
        {
          reply_markup: messageData.reply_markup,
        },
      );
    } catch (error) {
      this.logger.error(error.message, error);
    }

    if (chatId) {
      this.addToPlaylist(message as Message, song, songWhip);
    }
  }
}
