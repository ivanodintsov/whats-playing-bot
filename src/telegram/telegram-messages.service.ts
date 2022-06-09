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
  loading?: boolean;
  donate?: boolean;
};

@Injectable()
export class TelegramMessagesService {
  constructor(private readonly appConfig: ConfigService) {}

  createCurrentPlaying(props: ShareSongProps) {
    const message = this.createCurrentPlayingBase(props);

    message.title = `Now Playing: ${message.title}`;

    return message;
  }

  private createCurrentPlayingBase({
    track,
    from,
    songWhip,
    control,
    anonymous,
    loading,
    donate,
  }: ShareSongProps) {
    const username = from.first_name;
    const reply_markup = this.createTrackReplyMarkup({
      track,
      songWhip,
      control,
      loading,
      donate,
    });

    let message = `[${username}](tg://user?id=${from.id}) is listening now: *${track.name} - ${track.artists}*`;

    if (anonymous) {
      message = `${username} is listening now: *${track.name} - ${track.artists}*`;
    }

    return {
      track_id: track.id,
      title: `${track.name} - ${track.artists}`,
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
    songWhip: song,
    control = true,
    loading,
    donate = true,
  }: {
    track: TrackEntity;
    songWhip?: SongWhip;
    control?: boolean;
    loading?: boolean;
    donate?: boolean;
  }): InlineKeyboardMarkup {
    let { links } = this.createSongLinks({ song });
    const uri = track.id;

    if (!R.is(Array, links)) {
      links = [];
    }

    let keyboard: InlineKeyboardButton[][] = [];

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
    }

    if (loading) {
      keyboard = R.append(
        [
          {
            text: 'Loading...',
            url: this.appConfig.get<string>('FRONTEND_URL'),
          },
        ],
        keyboard,
      );
    }

    if (links.length) {
      const linksButtons = R.map(
        (item: SongWhipLink): InlineKeyboardButton => ({
          text: item.name,
          url: item.link,
        }),
        links,
      );

      if (donate) {
        const donateButton = this.createDonateButton();
        donateButton.text = '💳 🍪';

        linksButtons.push(donateButton);
      }

      keyboard = [...keyboard, ...R.splitEvery(3)(linksButtons)];
    }

    return {
      inline_keyboard: keyboard,
    };
  }

  createCurrentPlayingInline(props: ShareSongProps): InlineQueryResultPhoto {
    const messageData = this.createCurrentPlayingBase(props);

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

  private createSongBase(props: ShareSongProps) {
    const { track, songWhip } = props;
    const reply_markup = this.createTrackReplyMarkup(props);
    const thumb_url =
      track.thumb_url ||
      songWhip?.image ||
      `${this.appConfig.get<string>('SITE')}/images/123.jpg`;

    return {
      thumb_url,
      photo_url: thumb_url,
      photo_width: track.thumb_width,
      photo_height: track.thumb_width,
      reply_markup,
      message: `*${track.name} - ${track.artists}*`,
      parse_mode: 'Markdown' as ParseMode,
    };
  }

  createSongInline(props: ShareSongProps): InlineQueryResultPhoto {
    const { track } = props;
    const message = this.createSongBase(props);

    return {
      id: `SPOTIFY_SEARCH${track.id}`,
      type: 'photo',
      title: track.name,
      thumb_url: message.thumb_url,
      photo_url: message.thumb_url,
      photo_width: message.photo_width,
      photo_height: message.photo_height,
      reply_markup: message.reply_markup,
      caption: `*${track.name} - ${track.artists}*`,
      parse_mode: 'Markdown',
      description: track.artists,
    };
  }

  createSong(props: ShareSongProps) {
    const message = this.createSongBase(props);

    return message;
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

  createDonateInline(): InlineQueryResultArticle {
    const url = this.appConfig.get<string>('DONATE_URL');
    const message = this.createDonateMessage();
    const thumb_url = `${this.appConfig.get<string>(
      'SITE',
    )}/static/images/heart.png`;

    return {
      id: 'Donate',
      type: 'article',
      url,
      title: 'Donate',
      description: message.message,
      thumb_url,
      input_message_content: {
        message_text: message.message,
      },
      reply_markup: message.extras.reply_markup,
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

  createDonateMessage() {
    return {
      message:
        'Support the project and cover the costs of the server and cookies 🍪',
      extras: {
        reply_markup: {
          inline_keyboard: [[this.createDonateButton()]],
        },
      },
    };
  }

  private createDonateButton(): InlineKeyboardButton {
    return {
      text: 'Buy cookies 💳',
      url: this.appConfig.get<string>('DONATE_URL'),
    };
  }
}
