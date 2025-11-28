import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Queue } from 'bull';
import { SpotifyService } from 'src/spotify/spotify.service';
import { AbstractBotService } from 'src/bot-core/bot.service';
import {
  BOT_QUEUE,
  MESSAGES_SERVICE,
  SENDER_SERVICE,
} from 'src/bot-core/constants';
import { UserExistsError, UserNotExistsError } from 'src/bot-core/errors';
import { Message, MESSAGE_TYPES } from 'src/bot-core/message/message';
import { TelegramSender } from './telegram-sender.service';
import { Logger } from 'src/logger';
import { AbstractMessagesService } from 'src/bot-core/messages.service';
import { ConfigService } from '@nestjs/config';
import { ShareSongConfig, ShareSongData } from 'src/bot-core/types';
import { InjectQueue } from '@nestjs/bull';
import { SongsInfoService } from 'src/songs-info/songs-info.service';
import { TrackStatisticsService } from 'src/songs-info/track-statistics/track-statistics.service';
import { TelegramUser } from './models/telegram-user.model';
import { InjectModel } from '@nestjs/sequelize';
import { SomethingWentWrongException } from './errors';
import { UsersService } from 'src/users/users.service';
import { TrackPlaylistService } from 'src/track-playlist/track-playlist.service';
import { InjectGA4 } from 'src/utils/ga4';
import { GA4Service } from 'src/utils/ga4/ga4.service';

@Injectable()
export class TelegramBotService extends AbstractBotService {
  protected readonly logger = new Logger(TelegramBotService.name);

  constructor(
    protected readonly spotifyService: SpotifyService,

    @Inject(SENDER_SERVICE)
    public readonly sender: TelegramSender,

    @InjectQueue(BOT_QUEUE)
    protected readonly queue: Queue,

    @Inject(MESSAGES_SERVICE)
    protected readonly messagesService: AbstractMessagesService,

    @InjectModel(TelegramUser)
    private readonly telegramUserModel: typeof TelegramUser,

    private readonly jwtService: JwtService,

    protected readonly appConfig: ConfigService,

    protected readonly songsInfoService: SongsInfoService,

    protected readonly trackStatisticService: TrackStatisticsService,

    private readonly usersService: UsersService,

    protected readonly trackPlaylistService: TrackPlaylistService,

    @InjectGA4()
    protected readonly gaService: GA4Service,
  ) {
    super();
  }

  async createUser({ from, chat, providerUnique }: Message) {
    try {
      const { id, ...restUser } = from;
      let user = await this.telegramUserModel.findOne({
        where: {
          tg_id: id,
        },
      });

      if (!user) {
        const domainUser = await this.usersService.createEmptyUser();
        user = await this.telegramUserModel.create({
          userId: domainUser.id,
          first_name: restUser.firstName,
          last_name: restUser.lastName,
          language_code: restUser.languageCode,
          username: restUser.username,
          tg_id: id,
        });
      }

      const tokens = await this.spotifyService.getTokens({
        provider: providerUnique,
        userId: user.id,
      });

      if (tokens) {
        throw new UserExistsError();
      }

      const token = await this.jwtService.sign({
        id: user.tg_id,
        chatId: chat.id,
        userId: user.id,
      });

      return {
        token,
      };
    } catch (error) {
      if (error instanceof UserExistsError) {
        throw error;
      }

      this.logger.error(error.message, error.stack, 'createUser');
      throw new SomethingWentWrongException();
    }
  }

  async getUser(message: Message) {
    const user = await this.telegramUserModel.findOne({
      where: {
        tg_id: message.from.id,
      },
    });

    if (!user) {
      throw new UserNotExistsError();
    }

    return user;
  }

  async sendSongToChats(
    message: Message,
    data: ShareSongData,
    config: ShareSongConfig,
  ) {
    const CHATS = ['-1001187343299'];

    for (let i = 0; i < CHATS.length; i++) {
      const chatId = CHATS[i];
      await this.sendSongToChat(
        chatId,
        { ...message, type: MESSAGE_TYPES.SERVICE },
        data,
        config,
      );
    }
  }
}
