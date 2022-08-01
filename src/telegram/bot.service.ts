import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bull';
import { Model } from 'mongoose';
import {
  TelegramUser,
  TelegramUserDocument,
} from 'src/schemas/telegram.schema';
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
import { SongWhipService } from 'src/song-whip/song-whip.service';
import { AbstractMessagesService } from 'src/bot-core/messages.service';
import { ConfigService } from '@nestjs/config';
import { ShareSongData } from 'src/bot-core/types';
import { PlaylistService } from 'src/playlist/playlist.service';
import { InjectQueue } from '@nestjs/bull';
import { TelegramMessage } from './message/message';
import { MusicServicesService } from 'src/music-services/music-services.service';
import { SongsService } from 'src/songs/songs.service';

@Injectable()
export class TelegramBotService extends AbstractBotService {
  protected readonly logger = new Logger(TelegramBotService.name);

  constructor(
    protected readonly musicServices: MusicServicesService,

    @Inject(SENDER_SERVICE)
    protected readonly sender: TelegramSender,

    @InjectQueue(BOT_QUEUE)
    protected readonly queue: Queue,

    protected readonly songWhip: SongWhipService,

    @Inject(MESSAGES_SERVICE)
    protected readonly messagesService: AbstractMessagesService,

    protected readonly spotifyPlaylist: PlaylistService,

    protected readonly songsService: SongsService,

    @InjectModel(TelegramUser.name)
    private readonly telegramUserModel: Model<TelegramUserDocument>,
  ) {
    super();
  }

  async createUser({ from }: Message) {
    let user: TelegramUserDocument;

    try {
      const { id, ...restUser } = from;

      user = await this.telegramUserModel.findOne({
        tg_id: id,
      });

      if (!user) {
        user = new this.telegramUserModel({
          ...restUser,
          tg_id: id,
        });

        await user.save();
      }
    } catch (error) {}

    const tokens = await this.musicServices.isUserHasConnectedService({
      user: { tg_id: user.tg_id },
    });

    if (tokens) {
      throw new UserExistsError();
    }

    return user;
  }

  async sendSongToChats(message: Message, data: ShareSongData) {
    const CHATS = [-1001187343299];

    for (let i = 0; i < CHATS.length; i++) {
      const chatId = CHATS[i];
      await this.sendSongToChat(chatId, message, data);
    }
  }

  protected async unlinkUserService(message: TelegramMessage) {
    if (!message.from.id) {
      return;
    }

    await this.musicServices.remove({
      user: {
        tg_id: message.from.id,
      },
    });
  }

  protected generateMusicServiceUser(message: TelegramMessage) {
    return {
      tg_id: message.from.id as number,
    };
  }
}
