import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { SpotifyService } from 'src/spotify/spotify.service';
import { Telegraf, Types } from 'telegraf';
import {
  ChosenInlineResult,
  InlineQuery,
  InlineQueryResult,
  User,
} from 'typegram';
import { InlineQueryErrorHandler } from './inline-query-errors.handler';
import { Logger } from 'src/logger';
import { TelegramMessagesService } from '../telegram-messages.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class InlineService {
  private readonly logger = new Logger(InlineService.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly appConfig: ConfigService,
    private readonly spotifyService: SpotifyService,
    private readonly telegramMessagesService: TelegramMessagesService,
    @InjectQueue('telegramProcessor') private telegramProcessorQueue: Queue,
  ) {}

  @InlineQueryErrorHandler()
  async process(query: InlineQuery) {
    try {
      const results: InlineQueryResult[] = [];

      const options: Types.ExtraAnswerInlineQuery = {
        cache_time: 0,
      };

      const { track } = await this.spotifyService.getCurrentTrack({
        user: {
          tg_id: query.from.id,
        },
      });

      results.push(
        this.telegramMessagesService.createCurrentPlayingInline({
          track,
          from: query.from,
          control: true,
        }),
      );

      results.push(this.telegramMessagesService.createDonateInline());

      await this.bot.telegram.answerInlineQuery(query.id, results, options);
    } catch (error) {
      throw {
        error,
        query,
      };
    }
  }

  async chosenInlineResult(chosenInlineResult: ChosenInlineResult, from: User) {
    if (chosenInlineResult.result_id.startsWith('NOW_PLAYING')) {
      const match = chosenInlineResult.result_id?.match(
        /NOW_PLAYINGspotify:track:(?<spotifyId>.*)$/,
      );

      const { track } = await this.spotifyService.getTrack({
        id: match.groups.spotifyId,
        user: {
          tg_id: from.id,
        },
      });

      this.telegramProcessorQueue.add(
        'updateShare',
        {
          from: from,
          message: chosenInlineResult,
          track,
          config: {
            control: true,
          },
        },
        {
          attempts: 5,
          removeOnComplete: true,
        },
      );
    }
  }
}
