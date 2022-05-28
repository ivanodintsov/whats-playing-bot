import { Injectable } from '@nestjs/common';
import { TrackEntity } from 'src/domain/Track';
import {
  InlineKeyboardButton,
  InlineKeyboardMarkup,
  InlineQueryResultArticle,
  InlineQueryResultPhoto,
  ParseMode,
  User,
} from 'typegram';
import * as R from 'ramda';
import { ConfigService } from '@nestjs/config';
import { SongWhip } from 'src/schemas/song-whip.schema';
import { SongWhipLink } from 'src/graphql-frontend/models/song-whip.model';

const pointFreeUpperCase: (x0: any) => string = R.compose(
  R.join(''),
  R.juxt([R.compose(R.toUpper, R.head), R.tail]),
);

type ShareSongProps = {
  track: TrackEntity;
  from: User;
  songWhip?: SongWhip;
  control?: boolean;
  anonymous?: boolean;
};

@Injectable()
export class TelegramMessagesService {
  constructor(private readonly appConfig: ConfigService) {}

  createCurrentPlaying({
    track,
    from,
    songWhip,
    control,
    anonymous,
  }: ShareSongProps) {
    const username = from.first_name;
    const reply_markup = this.createTrackReplyMarkup({
      track,
      song: songWhip,
      control,
    });

    let message = `[${username}](tg://user?id=${from.id}) is listening now: *${track.name} - ${track.artists}*`;

    if (anonymous) {
      message = `${username} is listening now: *${track.name} - ${track.artists}*`;
    }

    return {
      track_id: track.id,
      title: `Now Playing: ${track.name} - ${track.artists}`,
      thumb_url:
        track.thumb_url ||
        songWhip?.image ||
        `${this.appConfig.get<string>('SITE')}/images/123.jpg`,
      thumb_width: track.thumb_width,
      thumb_height: track.thumb_height,
      message,
      parse_mode: 'Markdown' as ParseMode,
      reply_markup,
    };
  }

  createTrackReplyMarkup({
    track,
    song,
    control = true,
  }: {
    track: TrackEntity;
    song?: SongWhip;
    control?: boolean;
  }): InlineKeyboardMarkup {
    let { links } = this.createSongLinks({ song });
    const uri = track.id;

    if (!R.is(Array, links)) {
      links = [];
    }

    let keyboard: InlineKeyboardButton[][] = R.pipe(
      R.map(
        (item: SongWhipLink): InlineKeyboardButton => ({
          text: item.name,
          url: item.link,
        }),
      ),
      (list: InlineKeyboardButton[]) => R.splitEvery(3)(list),
    )(links);

    if (uri && control) {
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
    } else if (!keyboard.length) {
      keyboard = R.prepend(
        [
          {
            text: 'Loading...',
            url: this.appConfig.get<string>('FRONTEND_URL'),
          },
        ],
        keyboard,
      );
    }

    return {
      inline_keyboard: keyboard,
    };
  }

  createCurrentPlayingInline(props: ShareSongProps): InlineQueryResultPhoto {
    const messageData = this.createCurrentPlaying(props);

    return {
      id: `NOW_PLAYING${messageData.track_id}`,
      type: 'photo',
      title: 'Now Playing',
      thumb_url: messageData.thumb_url,
      photo_url: messageData.thumb_url,
      photo_width: messageData.thumb_width,
      photo_height: messageData.thumb_height,
      reply_markup: messageData.reply_markup,
      caption: messageData.message,
      parse_mode: messageData.parse_mode,
      description: messageData.title,
    };
  }

  createBotInfoInline(): InlineQueryResultArticle {
    const title = this.appConfig.get<string>('FRONTEND_TITLE');
    const url = this.appConfig.get<string>('FRONTEND_URL');
    const description = this.appConfig.get<string>('FRONTEND_DESCRIPTION');

    return {
      id: 'BotInfo',
      type: 'article',
      url,
      title,
      description,
      thumb_url: this.appConfig.get<string>('BOT_LOGO_IMAGE'),
      input_message_content: {
        message_text: `[${title}](${url}) - ${description}`,
        parse_mode: 'Markdown',
      },
    };
  }

  createNotPlayingInline(): InlineQueryResultArticle {
    return {
      id: 'NotPlaying',
      type: 'article',
      title: `Nothing is playing right now ☹️`,
      thumb_url: this.appConfig.get<string>('BOT_LOGO_IMAGE'),
      input_message_content: {
        message_text: `Nothing is playing right now ☹️`,
        parse_mode: 'Markdown',
      },
    };
  }

  private createSongLinks({
    song,
  }: {
    song: SongWhip;
  }): {
    links?: SongWhipLink[];
    image?: string;
  } {
    try {
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
      )(song);

      return {
        links,
        image: R.path(['image'], song),
      };
    } catch (error) {
      return {
        links: undefined,
        image: undefined,
      };
    }
  }
}