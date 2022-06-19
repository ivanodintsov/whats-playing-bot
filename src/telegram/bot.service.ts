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
import { InjectModuleQueue } from './decorators';
import { AbstractBotService } from './domain/bot.service';
import { SENDER_SERVICE } from './domain/constants';
import { UserExistsError } from './domain/errors';
import { Message } from './domain/message/message';
import { TelegramSender } from './telegram-sender.service';

@Injectable()
export class TelegramBotService extends AbstractBotService {
  constructor(
    protected readonly spotifyService: SpotifyService,

    @Inject(SENDER_SERVICE)
    protected readonly sender: TelegramSender,

    @InjectModuleQueue()
    protected readonly queue: Queue,

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
}
