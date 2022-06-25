import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bull';
import { Model } from 'mongoose';
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
import { PlaylistService } from 'src/playlist/playlist.service';
import { InjectQueue } from '@nestjs/bull';
import { DiscordMessage } from './message/message';
import { DiscordUser, DiscordUserDocument } from 'src/schemas/discord.schema';
import { MusicServicesService } from 'src/music-services/music-services.service';

@Injectable()
export class DiscordBotService extends AbstractBotService {
  protected readonly logger = new Logger(DiscordBotService.name);

  constructor(
    protected readonly musicServices: MusicServicesService,

    @Inject(SENDER_SERVICE)
    protected readonly sender: DiscordSender,

    @InjectQueue(BOT_QUEUE)
    protected readonly queue: Queue,

    protected readonly songWhip: SongWhipService,

    @Inject(MESSAGES_SERVICE)
    protected readonly messagesService: AbstractMessagesService,

    protected readonly spotifyPlaylist: PlaylistService,

    private readonly appConfig: ConfigService,

    @InjectModel(DiscordUser.name)
    private readonly userModel: Model<DiscordUserDocument>,

    private readonly jwtService: JwtService,
  ) {
    super();
  }

  async createUser({ from, chat }: DiscordMessage) {
    let user: DiscordUserDocument;

    try {
      const { id, ...restUser } = from;

      user = await this.userModel.findOne({
        discord_id: id,
      });

      if (!user) {
        user = new this.userModel({
          ...restUser,
          discord_id: id,
        });

        await user.save();
      }
    } catch (error) {}

    const tokens = await this.musicServices.getTokens({
      user: { discord_id: user.discord_id },
    });

    if (tokens) {
      throw new UserExistsError();
    }

    const token = await this.jwtService.sign({
      id: user.discord_id,
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

  protected async unlinkUserService(message: DiscordMessage) {
    if (!message.from.id) {
      return;
    }

    await this.musicServices.remove({
      user: {
        discord_id: `${message.from.id}`,
      },
    });
  }

  protected generateSpotifyQuery(message: DiscordMessage) {
    return {
      discord_id: message.from.id as string,
    };
  }
}
