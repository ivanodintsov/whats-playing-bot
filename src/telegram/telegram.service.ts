import { Injectable } from '@nestjs/common';
import * as tt from 'telegraf/typings/telegram-types';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Action, Hears, InjectBot, On, TelegrafProvider } from 'nestjs-telegraf';
import { TelegramUser, TelegramUserDocument } from 'src/schemas/telegram.schema';
import { SpotifyService } from 'src/spotify/spotify.service';
import * as R from 'ramda';
import { ConfigService } from '@nestjs/config';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import { KostyasBotService } from 'src/kostyas-bot/kostyas-bot.service';
import { SpotifyGuard } from './spotify.guard';
import { Context } from './types';
import { CommandsErrorsHandler } from './commands-errors.handler';
import { ActionsErrorsHandler } from './actions-errors.handler';

const pointFreeUpperCase: (x0: any) => string = R.compose(
  R.join(''),
  R.juxt([R.compose(R.toUpper, R.head), R.tail]),
);

@Injectable()
export class TelegramService {
  constructor(
    @InjectModel(TelegramUser.name) private readonly telegramUserModel: Model<TelegramUserDocument>,
    private readonly jwtService: JwtService,
    private readonly spotifyService: SpotifyService,
    private readonly appConfig: ConfigService,
    @InjectBot() private readonly bot: TelegrafProvider,
    private readonly songWhip: SongWhipService,
    private readonly kostyasBot: KostyasBotService,
  ) {}

  @Hears('/start')
  onStart (ctx: Context) {
    this.onStartHandler(ctx);
  }

  @Hears('/start sign_up_pm')
  onStartPm (ctx: Context) {
    this.onStartHandler(ctx);
  }

  private async onStartHandler(ctx: Context) {
    let user;
    const chat = ctx.message.chat;

    try {
      const { id, ...restUser } = ctx.message.from;
      user = new this.telegramUserModel({
        ...restUser,
        tg_id: id,
      });
      await user.save();
    } catch (error) {
      user = await this.telegramUserModel.findOne({
        tg_id: ctx.message.from.id,
      });
    }

    const tokens = await this.spotifyService.getTokens({
      tg_id: user.tg_id,
    });

    if (tokens) {
      ctx.reply('You are already connected to Spotify. Type @whats_playing_bot command to the text box below and you will see the magic 💫');
      return;
    }

    const token = await this.jwtService.sign({
      id: user.tg_id,
      chatId: chat.id,
    });

    const site = this.appConfig.get<string>('SITE');
    ctx.reply('Sign up', {
      reply_markup: {
        inline_keyboard: [[
          {
            text: 'Spotify',
            url: `${site}/telegram/bot?t=${token}`,
          }
        ]]
      }
    })
  }

  async getSongLinks(trackUrl: string) {
    try {
      const songs = await this.songWhip.getSong({
        url: trackUrl,
        country: 'us',
      });

      return R.pipe(
        R.pathOr({}, ['data', 'links']),
        R.pick([
          'tidal',
          'itunes',
          'spotify',
          'youtubeMusic',
        ]),
        R.toPairs,
        R.map(([key, value]: [string, any]) => {
          let headLink: any = R.head(value);

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
          }
        })
      )(songs);
    } catch (error) {
      return;
    }
  }

  async getCurrentTrack(ctx: Context) {
    const from = ctx.from;
    const { body } = await this.spotifyService.getMyCurrentPlayingTrack(ctx.spotify.tokens);
    const trackUrl: string = R.path(['item', 'external_urls', 'spotify'], body);

    if (!trackUrl) {
      throw new Error('NO_TRACK_URL');
    }

    const albumImage: any = R.path(['item', 'album', 'images', 1], body);
    const songName = R.pathOr('', ['item', 'name'], body);
    const artistsList = R.pathOr([], ['item', 'artists'], body);
    const uri: string = R.pathOr('', ['item', 'uri'], body);
    const artistsString = R.pipe(
      R.map(R.prop('name')),
      R.join(', '),
    )(artistsList);
    const username = from.first_name;

    const links = await this.getSongLinks(trackUrl);

    return {
      title: `Now Playing: ${songName} - ${artistsString}`,
      url: trackUrl,
      thumb_url: albumImage.url,
      thumb_width: albumImage.width,
      thumb_height: albumImage.height,
      message_text: `
      [${username}](tg://user?id=${from.id}) is listening now:
*${songName} - ${artistsString}*
[Listen on Spotify](${trackUrl})
      `,
      parse_mode: 'Markdown',
      links,
      uri,
    };
  }

  @Action(/PLAY_ON_SPOTIFY.*/gi)
  @ActionsErrorsHandler
  @SpotifyGuard
  async onPlay(ctx: Context) {
    const match = R.pathOr('', ['callbackQuery', 'data'], ctx).match(/PLAY_ON_SPOTIFY(?<spotifyId>.*)$/);
    const uri: string = R.path(['groups', 'spotifyId'], match);

    if (uri) {
      await this.spotifyService.playSong(ctx.spotify.tokens, uri);
      ctx.answerCbQuery('Yeah 🤟');
    }
  }

  @Action(/ADD_TO_QUEUE_SPOTIFY.*/gi)
  @ActionsErrorsHandler
  @SpotifyGuard
  async onAddToQueue(ctx: Context) {
    const match = R.pathOr('', ['callbackQuery', 'data'], ctx).match(/ADD_TO_QUEUE_SPOTIFY(?<spotifyId>.*)$/);
    const uri: string = R.path(['groups', 'spotifyId'], match);

    if (uri) {
      this.spotifyService.addToQueue(ctx.spotify.tokens, uri);
      ctx.answerCbQuery('Yeah 🤟');
    }
  }

  createSongsKeyboard(links, uri?: string): tt.InlineKeyboardMarkup | undefined {
    if (R.is(Array, links)) {
      let keyboard: any = R.pipe(
        R.map((item: any) => ({
          text: item.name,
          url: item.link,
        })),
        R.splitEvery(3),
      )(links);

      if (uri) {
        keyboard = R.prepend([
          {
            text: 'Play',
            callback_data: `PLAY_ON_SPOTIFY${uri}`,
          },
          {
            text: 'Add to queue',
            callback_data: `ADD_TO_QUEUE_SPOTIFY${uri}`,
          },
        ], keyboard);
      }

      return {
        inline_keyboard: keyboard,
      };
    }

    return undefined;
  }

  async getCurrentProfile(ctx: Context) {
    const { body } = await this.spotifyService.getProfile(ctx.spotify.tokens);
    return body;
  }

  @Hears(/\/share.*/gi)
  @CommandsErrorsHandler
  @SpotifyGuard
  async onShare (ctx: Context) {
    const data = await this.getCurrentTrack(ctx);
    const keyboard = this.createSongsKeyboard(data.links, data.uri);

    await ctx.reply(data.message_text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
    this.kostyasBot.sendLinks({
      link: data.url,
      chat_id: ctx.message.chat.id,
      user_chat_id: ctx.message.from.id,
    }).catch(console.log);
  }

  @Hears(/\/me.*/gi)
  @CommandsErrorsHandler
  @SpotifyGuard
  async onMe (ctx: Context) {
    const data = await this.getCurrentProfile(ctx);
    const username = data.display_name || ctx.message.from.first_name;

    ctx.reply(`[${username} Spotify Profile](${R.path(['external_urls', 'spotify'], data)})`, {
      parse_mode: 'Markdown',
    });
  }

  @Hears(/\/next.*/gi)
  @CommandsErrorsHandler
  @SpotifyGuard
  async onNext (ctx: Context) {
    await this.spotifyService.nextTrack(ctx.spotify.tokens);
  }

  @Hears(/\/previous.*/gi)
  @CommandsErrorsHandler
  @SpotifyGuard
  async onPrevious (ctx: Context) {
    await this.spotifyService.previousTrack(ctx.spotify.tokens);
  }

  @On('inline_query')
  @SpotifyGuard
  async on(ctx: Context) {
    const results = [];
    const from: Context['message']['from'] = R.path(['inlineQuery', 'from'], ctx);
    const options: tt.ExtraAnswerInlineQuery = {
      cache_time: 0,
    };

    try {
      const data = await this.getCurrentTrack(ctx);
      const keyboard = this.createSongsKeyboard([], data.uri);

      results.push({
        id: 'NowPlaying',
        type: 'article',
        title: data.title,
        url: data.url,
        thumb_url: data.thumb_url,
        thumb_width: data.thumb_width,
        thumb_height: data.thumb_height,
        reply_markup: keyboard,
        input_message_content: {
          message_text: data.message_text,
          parse_mode: data.parse_mode,
        },
      });
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

    ctx.answerInlineQuery(results, options);
  }

  spotifySuccess(payload) {
    this.bot.telegram.sendMessage(
      payload.chatId,
      'Spotify connected successfully. Type @whats_playing_bot command to the text box below and you will see the magic 💫',
    );
  };
}
