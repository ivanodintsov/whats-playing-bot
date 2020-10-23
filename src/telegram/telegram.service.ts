import { Injectable } from '@nestjs/common';
import * as tt from 'telegraf/typings/telegram-types';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Context, Hears, InjectBot, On, Start, TelegrafProvider } from 'nestjs-telegraf';
import { TelegramUser, TelegramUserDocument } from 'src/schemas/telegram.schema';
import { SpotifyService } from 'src/spotify/spotify.service';
import * as R from 'ramda';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  constructor(
    @InjectModel(TelegramUser.name) private readonly telegramUserModel: Model<TelegramUserDocument>,
    private readonly jwtService: JwtService,
    private readonly spotifyService: SpotifyService,
    private readonly appConfig: ConfigService,
    @InjectBot() private readonly bot: TelegrafProvider,
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

  async getCurrentTrack(
    from: Context['message']['from'],
  ) {
    const tokens = await this.spotifyService.getTokens({
      tg_id: from.id,
    });

    if (!tokens) {
      throw new Error('NO_TOKEN');
    }

    const { body } = await this.spotifyService.getMyCurrentPlayingTrack(tokens);
    const trackUrl = R.path(['item', 'external_urls', 'spotify'], body);

    
    if (!trackUrl) {
      throw new Error('NO_TRACK_URL');
    }

    const albumImage: any = R.path(['item', 'album', 'images', 1], body);
    const songName = R.pathOr('', ['item', 'name'], body);
    const artistsList = R.pathOr([], ['item', 'artists'], body);
    const artistsString = R.pipe(
      R.map(R.prop('name')),
      R.join(', '),
    )(artistsList);
    const username = from.first_name;

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
    };
  }

  @Hears(/\/share.*/gi)
  async onShare (ctx: Context) {
    try {
      const data = await this.getCurrentTrack(ctx.message.from);
      ctx.reply(data.message_text, {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      switch (error.message) {
        case 'NO_TOKEN':
          const url = `https://t.me/${this.appConfig.get<string>('TELEGRAM_BOT_NAME')}`
          ctx.reply(`You should connect Spotify account in a [private message](${url})`, {
            parse_mode: 'Markdown',
          });
          break;

        case 'NO_TRACK_URL':
          ctx.reply('Nothing is playing right now ☹️');
          break;

        default:
          break;
      }
    }
  }

  @On('inline_query')
  async on(ctx: Context) {
    const results = [];
    const from: Context['message']['from'] = R.path(['inlineQuery', 'from'], ctx);
    const options: tt.ExtraAnswerInlineQuery = {
      cache_time: 0,
    };

    try {
      const data = await this.getCurrentTrack(from);
      results.push({
        id: 'NowPlaying',
        type: 'article',
        title: data.title,
        url: data.url,
        thumb_url: data.thumb_url,
        thumb_width: data.thumb_width,
        thumb_height: data.thumb_height,
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
