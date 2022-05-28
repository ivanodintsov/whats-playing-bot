import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { ChosenInlineResult, Message, User } from 'typegram';
import { ConfigService } from '@nestjs/config';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import { CommandsErrorsHandler } from './commands-errors.handler';
import { SpotifyPlaylistService } from 'src/spotify/playlist.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Logger } from 'src/logger';
import { TelegramService } from './telegram.service';
import { SpotifyService } from 'src/spotify/spotify.service';
import { TelegramMessagesService } from './telegram-messages.service';
import { TrackEntity } from 'src/domain/Track';
import { SongWhip } from 'src/schemas/song-whip.schema';

type Config = {
  control?: boolean;
  loading?: boolean;
};

@Injectable()
export class CommandsService {
  private readonly logger = new Logger(CommandsService.name);

  constructor(
    private readonly appConfig: ConfigService,
    @InjectBot() private readonly bot: Telegraf,
    private readonly songWhip: SongWhipService,
    private readonly spotifyPlaylist: SpotifyPlaylistService,
    @InjectQueue('telegramProcessor') private telegramProcessorQueue: Queue,
    private readonly telegramService: TelegramService,
    private readonly spotifyService: SpotifyService,
    private readonly telegramMessagesService: TelegramMessagesService,
  ) {}

  async updateShare(
    message: Message | ChosenInlineResult,
    from: User,
    song: TrackEntity,
    config?: Config,
  ) {
    const songWhip = await this.songWhip.getSong({
      url: song.url,
      country: 'us',
    });

    const messageData = this.telegramMessagesService.createCurrentPlaying({
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
      console.log(error);
    }

    if (chatId) {
      this.addToPlaylist(message as Message, song, songWhip);
    }
  }

  @CommandsErrorsHandler()
  async share(ctx: Message, config?: Config) {
    const { track } = await this.spotifyService.getCurrentTrack({
      user: {
        tg_id: ctx.from.id,
      },
    });
    const messageData = this.telegramMessagesService.createCurrentPlaying({
      from: ctx.from,
      track,
      control: config?.control,
      loading: config?.loading,
    });

    const message: Message = await this.bot.telegram.sendPhoto(
      ctx.chat.id,
      messageData.thumb_url,
      {
        parse_mode: messageData.parse_mode,
        reply_markup: messageData.reply_markup,
        caption: messageData.message,
      },
    );

    this.telegramProcessorQueue.add(
      'updateShare',
      {
        from: ctx.from,
        message,
        track,
        config,
      },
      {
        attempts: 5,
        removeOnComplete: true,
      },
    );
  }

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
}
