import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Queue } from 'bull';
import { Model } from 'mongoose';
import { SpotifyService } from 'src/spotify/spotify.service';
import { AbstractBotService } from 'src/bot-core/bot.service';
import {
  BOT_QUEUE,
  MESSAGES_SERVICE,
  SENDER_SERVICE,
} from 'src/bot-core/constants';
import { UserExistsError } from 'src/bot-core/errors';
import { Message } from 'src/bot-core/message/message';
import { TelegramSender } from './telegram-sender.service';
import { Logger } from 'src/logger';
import { AbstractMessagesService } from 'src/bot-core/messages.service';
import { ConfigService } from '@nestjs/config';
import { ShareSongData } from 'src/bot-core/types';
import { SpotifyPlaylistService } from 'src/spotify/playlist.service';
import { InjectQueue } from '@nestjs/bull';
import { SongsInfoService } from 'src/songs-info/songs-info.service';
import { TrackStatisticsService } from 'src/songs-info/track-statistics/track-statistics.service';
import { TelegramUser } from './models/telegram-user.model';
import { InjectModel } from '@nestjs/sequelize';

@Injectable()
export class TelegramBotService extends AbstractBotService {
  protected readonly logger = new Logger(TelegramBotService.name);

  constructor(
    protected readonly spotifyService: SpotifyService,

    @Inject(SENDER_SERVICE)
    protected readonly sender: TelegramSender,

    @InjectQueue(BOT_QUEUE)
    protected readonly queue: Queue,

    @Inject(MESSAGES_SERVICE)
    protected readonly messagesService: AbstractMessagesService,

    protected readonly spotifyPlaylist: SpotifyPlaylistService,

    @InjectModel(TelegramUser)
    private readonly telegramUserModel: typeof TelegramUser,

    private readonly jwtService: JwtService,

    private readonly appConfig: ConfigService,

    protected readonly songsInfoService: SongsInfoService,

    protected readonly trackStatisticService: TrackStatisticsService,
  ) {
    super();
  }

  async createUser({ from, chat }: Message) {
    let user: TelegramUser;

    try {
      const { id, ...restUser } = from;

      user = await this.telegramUserModel.findOne({
        where: {
          tg_id: id,
        },
      });

      if (!user) {
        user = await this.telegramUserModel.create({
          first_name: restUser.firstName,
          last_name: restUser.lastName,
          language_code: restUser.languageCode,
          username: restUser.username,
          tg_id: id,
        });
      }
    } catch (error) {}

    const tokens = await this.spotifyService.getTokens({
      tg_id: user.tg_id,
    });

    if (tokens) {
      throw new UserExistsError();
    }

    const token = await this.jwtService.sign({
      id: user.tg_id,
      chatId: chat.id,
    });

    return {
      token,
    };
  }

  async sendSongToChats(message: Message, data: ShareSongData) {
    const CHATS = ['-1001187343299'];

    for (let i = 0; i < CHATS.length; i++) {
      const chatId = CHATS[i];
      await this.sendSongToChat(chatId, message, data);
    }
  }
}
