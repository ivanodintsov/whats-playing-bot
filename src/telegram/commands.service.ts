import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { InlineKeyboardMarkup, Message } from 'typegram';
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
import { SpotifyPlaylistService } from 'src/spotify/playlist.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Logger } from 'src/logger';

const pointFreeUpperCase: (x0: any) => string = R.compose(
  R.join(''),
  R.juxt([R.compose(R.toUpper, R.head), R.tail]),
);

@Injectable()
export class CommandsService {
  private readonly logger = new Logger(CommandsService.name);

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
    @InjectQueue('telegramProcessor') private telegramProcessorQueue: Queue,
  ) {}

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
      title: `Now Playing: ${songName} - ${artistsString}`,
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

  createSongsKeyboard(
    songsLinks,
    uri?: string,
  ): InlineKeyboardMarkup | undefined {
    let links = songsLinks;

    if (!R.is(Array, links)) {
      links = [];
    }

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

  async updateShare(message: Message, ctx: Context, song: CurrentTrack) {
    const defaultImage = `${this.appConfig.get<string>(
      'SITE',
    )}/static/images/123.jpg`;
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
        ...ctx,
        type: 'photo',
        media: song.thumb_url || songWhip.image || defaultImage,
        caption: song.message_text,
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      },
      song,
    };
  }

  @CommandsErrorsHandler()
  @SpotifyGuard
  async share(ctx: Context) {
    const data = await this.getCurrentTrack(ctx);
    const keyboard = this.createSongsKeyboard([], data.uri);
    const message: Message = await this.bot.telegram.sendPhoto(
      ctx.chat.id,
      data.thumb_url || `${this.appConfig.get<string>('SITE')}/images/123.jpg`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
        caption: data.message_text,
      },
    );

    this.telegramProcessorQueue.add(
      'updateShare',
      {
        messageToUpdate: message,
        message: ctx,
        track: data,
      },
      {
        attempts: 5,
        removeOnComplete: true,
      },
    );
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
    } catch (error) {}
  }
}
