import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bull';
import { Model } from 'mongoose';
import {
  TelegramUser,
  TelegramUserDocument,
} from 'src/schemas/telegram.schema';
import { SpotifyService } from 'src/spotify/spotify.service';
import { AbstractBotService } from 'src/bot-core/bot.service';
import {
  BOT_QUEUE,
  MESSAGES_SERVICE,
  SENDER_SERVICE,
} from 'src/bot-core/constants';
import { UserExistsError } from 'src/bot-core/errors';
import { Message } from 'src/bot-core/message/message';
import { DiscordSender } from './sender.service';
import { Logger } from 'src/logger';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import { AbstractMessagesService } from 'src/bot-core/messages.service';
import { ConfigService } from '@nestjs/config';
import { ShareSongData } from 'src/bot-core/types';
import { SpotifyPlaylistService } from 'src/spotify/playlist.service';
import { InjectQueue } from '@nestjs/bull';
import { DiscordMessage } from './message/message';

@Injectable()
export class DiscordBotService extends AbstractBotService {
  protected readonly logger = new Logger(DiscordBotService.name);

  constructor(
    protected readonly spotifyService: SpotifyService,

    @Inject(SENDER_SERVICE)
    protected readonly sender: DiscordSender,

    @InjectQueue(BOT_QUEUE)
    protected readonly queue: Queue,

    protected readonly songWhip: SongWhipService,

    @Inject(MESSAGES_SERVICE)
    protected readonly messagesService: AbstractMessagesService,

    protected readonly spotifyPlaylist: SpotifyPlaylistService,

    private readonly appConfig: ConfigService,

    @InjectModel(TelegramUser.name)
    private readonly telegramUserModel: Model<TelegramUserDocument>,

    private readonly jwtService: JwtService,
  ) {
    super();
  }

  async createUser({ from, chat }: Message) {
    let user;

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
    // const CHATS = [-1001187343299];
    // for (let i = 0; i < CHATS.length; i++) {
    //   const chatId = CHATS[i];
    //   await this.sendSongToChat(chatId, message, data);
    // }
  }
}
