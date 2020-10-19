import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Context, Hears, On, Start } from 'nestjs-telegraf';
import { TelegramUser, TelegramUserDocument } from 'src/schemas/telegram.schema';
import { SpotifyService } from 'src/spotify/spotify.service';
import * as R from 'ramda';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  constructor(
    @InjectModel(TelegramUser.name) private telegramUserModel: Model<TelegramUserDocument>,
    private readonly jwtService: JwtService,
    private readonly spotifyService: SpotifyService,
    private readonly appConfig: ConfigService,
  ) {}

  @Hears('/start sign_up_asdk-----ASdsadJlk')
  async onStart(ctx: Context) {
    let user;

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

    const token = await this.jwtService.sign({
      id: user.tg_id,
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

  @On('inline_query')
  async on(ctx: Context) {
    const results = [];
    const from: Context['message']['from'] = R.path(['inlineQuery', 'from'], ctx);

    // if (true) {
    //   results.push({
    //     id: 'TemporarilyUnavailable',
    //     type: 'article',
    //     title: `Temporarily unavailable`,
    //     url: 'https://spotify.odintsov.me',
    //     hide_url: true,
    //     input_message_content: {
    //       message_text: `Temporarily unavailable`,
    //       parse_mode: 'Markdown',
    //     },
    //   });
    //   ctx.answerInlineQuery(results, {
    //     cache_time: 0,
    //   });
    //   return;
    // }

    const user = await this.telegramUserModel.findOne({
      tg_id: ctx.inlineQuery.from.id,
    });

    if (!user) {
      ctx.answerInlineQuery([], {
        switch_pm_text: 'Sign up',
        switch_pm_parameter: 'sign_up_asdk-----ASdsadJlk',
        cache_time: 0,
      })
      return;
    }

    const tokens = await this.spotifyService.getTokens({
      tg_id: user.tg_id,
    })
    const { body } = await this.spotifyService.getMyCurrentPlayingTrack(tokens);
    const trackUrl = R.path(['item', 'external_urls', 'spotify'], body);
    const albumImage: any = R.path(['item', 'album', 'images', 1], body);
    const songName = R.pathOr('', ['item', 'name'], body);
    const artistsList = R.pathOr([], ['item', 'artists'], body);
    const artistsString = R.pipe(
      R.map(R.prop('name')),
      R.join(', '),
    )(artistsList);

    if (trackUrl) {
      results.push({
        id: 'NowPlaying',
        type: 'article',
        title: `Now Playing: ${songName} - ${artistsString}`,
        url: trackUrl,
        thumb_url: albumImage.url,
        thumb_width: albumImage.width,
        thumb_height: albumImage.height,
        input_message_content: {
          message_text: `
          [@${from.username}](tg://user?id=${from.id}) is listening now:
*${songName} - ${artistsString}*
[Listen on Spotify](${trackUrl})
          `,
          parse_mode: 'Markdown',
        },
      });
    }

    ctx.answerInlineQuery(results, {
      cache_time: 0,
    });
  }
}
