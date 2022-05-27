import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Action, Hears, InjectBot, On, Update } from 'nestjs-telegraf';
import { Telegraf, Types } from 'telegraf';
import {
  TelegramUser,
  TelegramUserDocument,
} from 'src/schemas/telegram.schema';
import { SpotifyService } from 'src/spotify/spotify.service';
import * as R from 'ramda';
import { ConfigService } from '@nestjs/config';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import { KostyasBotService } from 'src/kostyas-bot/kostyas-bot.service';
import { SpotifyGuard } from './spotify.guard';
import { Context, CurrentTrack, SongWhip } from './types';
import { CommandsErrorsHandler } from './commands-errors.handler';
import { ActionsErrorsHandler } from './actions-errors.handler';
import { SpotifyPlaylistService } from 'src/spotify/playlist.service';
import { ChannelPostingService } from './channel-posting/channel-posting.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  InlineKeyboardMarkup,
  Message,
  InlineQueryResult,
  ParseMode,
  InlineQueryResultPhoto,
} from 'typegram';
import { RateLimit } from './rate-limit.guard';
import { Logger } from 'src/logger';

const pointFreeUpperCase: (x0: any) => string = R.compose(
  R.join(''),
  R.juxt([R.compose(R.toUpper, R.head), R.tail]),
);

@Update()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    @InjectModel(TelegramUser.name)
    private readonly telegramUserModel: Model<TelegramUserDocument>,
    private readonly jwtService: JwtService,
    private readonly spotifyService: SpotifyService,
    private readonly appConfig: ConfigService,
    @InjectBot() private readonly bot: Telegraf,
    private readonly songWhip: SongWhipService,
    private readonly kostyasBot: KostyasBotService,
    private readonly spotifyPlaylist: SpotifyPlaylistService,
    private readonly channelPostingService: ChannelPostingService,
    @InjectQueue('telegramProcessor') private telegramProcessorQueue: Queue,
  ) {}

  @Hears('/start')
  onStart(ctx: Context) {
    this.onStartHandler(ctx);
  }

  @Hears('/start sign_up_pm')
  onStartPm(ctx: Context) {
    this.onStartHandler(ctx);
  }

  @CommandsErrorsHandler()
  private async onStartHandler(ctx: Context) {
    let user;
    const chat = ctx.message.chat;

    if (chat.type !== 'private') {
      throw new Error('PRIVATE_ONLY');
    }

    try {
      const { id, ...restUser } = ctx.message.from;

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
      ctx.reply(
        'You are already connected to Spotify. Type /share command to the text box below and you will see the magic 💫',
      );
      return;
    }

    const token = await this.jwtService.sign({
      id: user.tg_id,
      chatId: chat.id,
    });

    const site = this.appConfig.get<string>('SITE');
    ctx.reply('Please sign up and let the magic happens 💫', {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Sign up with Spotify',
              url: `${site}/telegram/bot?t=${token}`,
            },
          ],
        ],
      },
    });
  }

  async getSongLinks(trackUrl: string): Promise<SongWhip> {
    try {
      const songs = await this.songWhip.getSong({
        url: trackUrl,
        country: 'us',
      });

      const links = R.pipe(
        R.pathOr({}, ['links']),
        R.pick(['tidal', 'itunes', 'spotify', 'youtubeMusic']),
        R.toPairs,
        R.map(([key, value]: [string, any]) => {
          const headLink: any = R.head(value);

          if (key === 'itunes') {
            const country = R.pipe(
              R.pathOr('', ['countries', 0]),
              R.toLower,
            )(headLink);
            headLink.link = headLink.link.replace('{country}', country);
          }

          return {
            name: pointFreeUpperCase(key),
            ...headLink,
          };
        }),
      )(songs);

      return {
        links,
        image: R.path(['image'], songs),
      };
    } catch (error) {
      return {
        links: undefined,
        image: undefined,
      };
    }
  }

  async getCurrentTrack(ctx: Context) {
    const from = ctx.from;
    const { body } = await this.spotifyService.getMyCurrentPlayingTrack(
      ctx.spotify.tokens,
    );
    const trackUrl: string = R.path(['item', 'external_urls', 'spotify'], body);

    if (!trackUrl) {
      throw new Error('NO_TRACK_URL');
    }

    const albumImage: any = R.pathOr({}, ['item', 'album', 'images', 1], body);
    const songName = R.pathOr('', ['item', 'name'], body);
    const artistsList = R.pathOr([], ['item', 'artists'], body);
    const uri: string = R.pathOr('', ['item', 'uri'], body);
    const artistsString = R.pipe(
      R.map(R.prop('name')),
      R.join(', '),
    )(artistsList);
    const username = from.first_name;

    return {
      action: 'Now Playing',
      title: `${songName} - ${artistsString}`,
      name: songName,
      artists: artistsString,
      url: trackUrl,
      thumb_url: albumImage.url,
      thumb_width: albumImage.width,
      thumb_height: albumImage.height,
      message_text: `
      [${username}](tg://user?id=${from.id}) is listening now: *${songName} - ${artistsString}*`,
      parse_mode: 'Markdown',
      uri,
    };
  }

  @Action(/PLAY_ON_SPOTIFY.*/gi)
  @ActionsErrorsHandler()
  @SpotifyGuard
  async onPlay(ctx: Context) {
    const match = R.pathOr('', ['callbackQuery', 'data'], ctx).match(
      /PLAY_ON_SPOTIFY(?<spotifyId>.*)$/,
    );
    const uri: string = R.path(['groups', 'spotifyId'], match);

    if (uri) {
      await this.spotifyService.playSong(ctx.spotify.tokens, uri);
      ctx.answerCbQuery('Yeah 🤟');
    }
  }

  @Action(/ADD_TO_QUEUE_SPOTIFY.*/gi)
  @ActionsErrorsHandler()
  @SpotifyGuard
  async onAddToQueue(ctx: Context) {
    const match = R.pathOr('', ['callbackQuery', 'data'], ctx).match(
      /ADD_TO_QUEUE_SPOTIFY(?<spotifyId>.*)$/,
    );
    const uri: string = R.path(['groups', 'spotifyId'], match);

    if (uri) {
      await this.spotifyService.addToQueue(ctx.spotify.tokens, uri);
      ctx.answerCbQuery('Yeah 🤟');
    }
  }

  createSongsKeyboard(links, uri?: string): InlineKeyboardMarkup {
    if (R.is(Array, links)) {
      let keyboard: any = R.pipe(
        R.map((item: any) => ({
          text: item.name,
          url: item.link,
        })),
        R.splitEvery(3),
      )(links);

      if (uri) {
        keyboard = R.prepend(
          [
            {
              text: 'Play',
              callback_data: `PLAY_ON_SPOTIFY${uri}`,
            },
            {
              text: 'Add to queue',
              callback_data: `ADD_TO_QUEUE_SPOTIFY${uri}`,
            },
          ],
          keyboard,
        );
      }

      return {
        inline_keyboard: keyboard,
      };
    }

    return {
      inline_keyboard: [],
    };
  }

  async getCurrentProfile(ctx: Context) {
    try {
      const { body } = await this.spotifyService.getProfile(ctx.spotify.tokens);
      return body;
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

  async updateShare(message: Message, ctx: Context, song: CurrentTrack) {
    const defaultImage = `${this.appConfig.get<string>('SITE')}/images/123.jpg`;
    const songWhip = await this.getSongLinks(song.url);
    const keyboard = this.createSongsKeyboard(songWhip.links, song.uri);

    this.bot.telegram.editMessageMedia(
      message.chat.id,
      message.message_id,
      undefined,
      {
        type: 'photo',
        media: song.thumb_url || songWhip.image || defaultImage,
        caption: song.message_text,
        parse_mode: 'Markdown',
      },
      {
        reply_markup: keyboard,
      },
    );

    this.addToPlaylist(ctx, song, songWhip);

    return {
      message: {
        ...ctx.message,
        type: 'photo',
        media: song.thumb_url || songWhip.image || defaultImage,
        caption: song.message_text,
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
      song,
    };
  }

  @Hears(/^\/share.*/gi)
  @RateLimit
  async onShare(ctx: Context) {
    try {
      await this.telegramProcessorQueue.add(
        'shareSong',
        {
          message: ctx.message,
        },
        {
          attempts: 5,
          removeOnComplete: true,
        },
      );
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

  @Hears(/^\/me.*/gi)
  @RateLimit
  @CommandsErrorsHandler()
  @SpotifyGuard
  async onMe(ctx: Context) {
    const data = await this.getCurrentProfile(ctx);
    const username = data.display_name || ctx.message.from.first_name;

    await ctx.reply(
      `[${username} Spotify Profile](${R.path(
        ['external_urls', 'spotify'],
        data,
      )})`,
      {
        parse_mode: 'Markdown',
      },
    );
  }

  @Hears(/^\/next.*/gi)
  @RateLimit
  @CommandsErrorsHandler()
  @SpotifyGuard
  async onNext(ctx: Context) {
    await this.spotifyService.nextTrack(ctx.spotify.tokens);
  }

  @Hears(/^\/previous.*/gi)
  @RateLimit
  @CommandsErrorsHandler()
  @SpotifyGuard
  async onPrevious(ctx: Context) {
    await this.spotifyService.previousTrack(ctx.spotify.tokens);
  }

  @On('inline_query')
  @ActionsErrorsHandler()
  @SpotifyGuard
  async on(ctx: Context) {
    const results: InlineQueryResult[] = [];
    const from: Context['message']['from'] = R.path(
      ['inlineQuery', 'from'],
      ctx,
    );
    const options: Types.ExtraAnswerInlineQuery = {
      cache_time: 0,
    };

    try {
      const data = await this.getCurrentTrack(ctx);
      const keyboard = this.createSongsKeyboard([], data.uri);

      const inlineQueryResult: InlineQueryResultPhoto = {
        id: data.action,
        type: 'photo',
        title: data.action,
        thumb_url: data.thumb_url,
        photo_url: data.thumb_url,
        photo_width: data.thumb_width,
        photo_height: data.thumb_height,
        reply_markup: keyboard,
        caption: data.message_text,
        parse_mode: data.parse_mode as ParseMode,
        description: data.title,
      };
      results.push(inlineQueryResult);
    } catch (error) {
      switch (error.message) {
        case 'NO_TOKEN':
          options.switch_pm_text = 'Sign up';
          options.switch_pm_parameter = 'sign_up_pm';
          break;

        case 'NO_TRACK_URL':
          results.push({
            id: 'NotPlaying',
            type: 'article',
            title: `Nothing is playing right now ☹️`,
            input_message_content: {
              message_text: `Nothing is playing right now ☹️`,
              parse_mode: 'Markdown',
            },
          });
          break;

        default:
          break;
      }
    }

    try {
      await ctx.answerInlineQuery(results, options);
    } catch (error) {
      console.log(error);
    }
  }

  async spotifySuccess(payload) {
    try {
      await this.bot.telegram.sendMessage(
        payload.chatId,
        'Spotify connected successfully. Type /share command to the text box below and you will see the magic 💫',
      );
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

  private async addToPlaylist(
    ctx: Context,
    song: CurrentTrack,
    songWhip: SongWhip,
  ) {
    try {
      const newSong = await this.spotifyPlaylist.addSong({
        tg_user_id: ctx.from.id,
        chat_id: ctx.chat.id,
        name: song.name,
        artists: song.artists,
        url: song.url,
        uri: song.uri,
        spotifyImage: song.thumb_url,
        image: songWhip.image,
      });
      return newSong;
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

  @Hears(/^\/history/gi)
  @RateLimit
  async onHistory(ctx: Context) {
    const url = `${this.appConfig.get<string>('FRONTEND_URL')}/chats/${
      ctx.chat.id
    }`;
    try {
      await ctx.reply(url);
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

  @Hears('/unlink_spotify')
  @CommandsErrorsHandler()
  async onUnlinkSpotify(ctx: Context) {
    const chat = ctx.message.chat;

    if (chat.type !== 'private') {
      throw new Error('PRIVATE_ONLY');
    }

    console.log(
      'unlinked account',
      `${ctx.message.from.id}`,
      ctx.message.from.id,
      JSON.stringify(ctx.message),
    );
    await this.spotifyService.removeByTgId(`${ctx.message.from.id}`);

    await ctx.reply('Your account has been successfully unlinked', {
      parse_mode: 'Markdown',
    });
  }
}
