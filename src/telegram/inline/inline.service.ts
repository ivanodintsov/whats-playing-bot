import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { Queue } from 'bull';
import { InjectModuleQueue } from '../decorators';
import { InjectModuleBot } from '../decorators/inject-bot';
import { Message } from '../domain/message/message';

@Injectable()
export class InlineService {
  private readonly logger = new Logger(InlineService.name);

  constructor(
    @InjectModuleBot() private readonly bot: Telegraf,
    private readonly appConfig: ConfigService,
    private readonly spotifyService: SpotifyService,
    private readonly telegramMessagesService: TelegramMessagesService,
    @InjectModuleQueue() private readonly telegramProcessorQueue: Queue,
  ) {}

  async processCurrentTrack(query: InlineQuery) {
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

  async processSongsSearch(query: InlineQuery) {
    try {
      const limit = 20;
      const offset = query.offset ? parseInt(query.offset, 10) : 0;
      const response = await this.spotifyService.searchTracks({
        user: { tg_id: query.from.id },
        search: query.query,
        options: {
          pagination: {
            offset,
            limit,
          },
        },
      });

      let results: InlineQueryResult[] = [];

      const options: Types.ExtraAnswerInlineQuery = {
        cache_time: 0,
        next_offset: response.pagination.next ? `${offset + limit}` : null,
      };

      const songs = response.tracks.map(track =>
        this.telegramMessagesService.createSongInline({
          track,
          from: query.from,
          control: true,
          loading: true,
        }),
      );

      results = [...songs, ...results];

      results.push(this.telegramMessagesService.createDonateInline());

      await this.bot.telegram.answerInlineQuery(query.id, results, options);
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

  @InlineQueryErrorHandler()
  async process(query: InlineQuery) {
    if (query.query) {
      await this.processSongsSearch(query);
    } else {
      await this.processCurrentTrack(query);
    }
  }

  async processNowPlaying(message: Message) {
    const match = message.text?.match(
      /NOW_PLAYINGspotify:track:(?<spotifyId>.*)$/,
    );

    const { track } = await this.spotifyService.getTrack({
      id: match.groups.spotifyId,
      user: {
        tg_id: message.from.id,
      },
    });

    this.telegramProcessorQueue.add(
      'updateShare',
      {
        message,
        messageToUpdate: message,
        data: { track },
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

  async processSong(message: Message) {
    const match = message.text?.match(
      /SPOTIFY_SEARCHspotify:track:(?<spotifyId>.*)$/,
    );

    const { track } = await this.spotifyService.getTrack({
      id: match.groups.spotifyId,
      user: {
        tg_id: message.from.id,
      },
    });

    this.telegramProcessorQueue.add(
      'updateSearch',
      {
        message,
        messageToUpdate: message,
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

  async chosenInlineResult(message: Message) {
    if (message.text.startsWith('NOW_PLAYING')) {
      await this.processNowPlaying(message);
    }

    if (message.text.startsWith('SPOTIFY_SEARCH')) {
      await this.processSong(message);
    }
  }
}
