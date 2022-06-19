import * as R from 'ramda';
import { ConfigService } from '@nestjs/config';
import { SongWhip } from 'src/schemas/song-whip.schema';
import { Message } from './message/message';
import {
  SEARCH_ITEM_TYPES,
  TButton,
  TButtonLink,
  TSenderMessageContent,
  TSenderSongSearchItem,
  TSenderTextSearchItem,
} from './sender.service';
import { SongWhipLink } from 'src/graphql-frontend/models/song-whip.model';
import { ShareSongConfig, ShareSongData } from './types';
import { ACTIONS } from './constants';

const pointFreeUpperCase: (x0: any) => string = R.compose(
  R.join(''),
  R.juxt([R.compose(R.toUpper, R.head), R.tail]),
);

export abstract class AbstractMessagesService {
  protected abstract readonly appConfig: ConfigService;

  getSignUpMessage(message: Message): TSenderMessageContent {
    return {
      text: 'Please sign up and let the magic happens 💫',
    };
  }

  getSpotifySignUpButton(message: Message, token: string): TButtonLink {
    const site = this.appConfig.get<string>('SITE');

    return {
      text: 'Sign up with Spotify',
      url: `${site}/telegram/bot?t=${token}`,
    };
  }

  getSpotifyAlreadyConnectedMessage(message: Message): TSenderMessageContent {
    return {
      text:
        'You are already connected to Spotify. Type /share command to the text box below and you will see the magic 💫',
    };
  }

  createCurrentPlaying(
    message: Message,
    data: ShareSongData,
    config: ShareSongConfig,
  ): TSenderMessageContent {
    const messageContent = this.createCurrentPlayingBase(message, data, config);

    return messageContent;
  }

  createCurrentPlayingMentionedTextMessage(
    message: Message,
    data: ShareSongData,
    config: ShareSongConfig,
  ): TSenderMessageContent {
    const username = message.from.firstName;

    if (config.anonymous) {
      return {
        text: `You are listening now: ${data.track.name} - ${data.track.artists}`,
      };
    }

    return {
      text: `${username} is listening now: ${data.track.name} - ${data.track.artists}`,
    };
  }

  private createDonateButton(): TButton {
    return {
      text: 'Buy cookies 💳',
      url: this.appConfig.get<string>('DONATE_URL'),
    };
  }

  createTrackButtons(
    message: Message,
    data: ShareSongData,
    song: ShareSongConfig,
  ): TButton[][] {
    const { control = true, loading, donate = true } = song;
    const { track, songWhip } = data;

    let { links } = this.createSongLinks({ song: songWhip });
    const uri = track.id;

    if (!R.is(Array, links)) {
      links = [];
    }

    let buttons: TButton[][] = [];

    if (uri && control) {
      buttons = R.prepend(
        [
          {
            text: '🍔',
            callbackData: `ADD_TO_QUEUE_SPOTIFY${uri}`,
          },
          {
            text: '◀◀',
            callbackData: `PREVIOUS`,
          },
          {
            text: '▶',
            callbackData: `PLAY_ON_SPOTIFY${uri}`,
          },

          {
            text: '▶▶',
            callbackData: `NEXT`,
          },
          {
            text: '🔥',
            callbackData: `ADD_TO_FAVORITE${uri}`,
          },
        ],
        buttons,
      );
    }

    if (loading) {
      buttons = R.append(
        [
          {
            text: 'Loading...',
            url: this.appConfig.get<string>('FRONTEND_URL'),
          },
        ],
        buttons,
      );
    }

    if (links.length) {
      const linksButtons = R.map(
        (item: SongWhipLink): TButton => ({
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

      buttons = [...buttons, ...R.splitEvery(3)(linksButtons)];
    }

    return buttons;
  }

  createShareSearchItem(
    message: Message,
    data: ShareSongData,
    config: ShareSongConfig = {},
  ): TSenderSongSearchItem {
    const messageData = this.createCurrentPlayingBase(message, data, config);
    const { track } = data;

    return {
      action: `${ACTIONS.NOW_PLAYING}${data.track.id}`,
      type: SEARCH_ITEM_TYPES.SONG,
      title: 'Now Playing',
      description: `${track.name} - ${track.artists}`,
      image: messageData.image,
      message: messageData,
    };
  }

  createSongSearchItem(
    message: Message,
    data: ShareSongData,
    config: ShareSongConfig = {},
  ): TSenderSongSearchItem {
    const messageData = this.createCurrentPlayingBase(message, data, config);
    const { track } = data;

    return {
      action: `${ACTIONS.SPOTIFY_SEARCH}${data.track.id}`,
      type: SEARCH_ITEM_TYPES.SONG,
      title: track.name,
      description: track.artists,
      image: messageData.image,
      message: messageData,
    };
  }

  createDonateSearchItem(): TSenderTextSearchItem {
    const messageData = this.createDonateMessage();
    const imageUrl = `${this.appConfig.get<string>(
      'SITE',
    )}/static/images/heart.png`;

    return {
      action: ACTIONS.DONATE,
      type: SEARCH_ITEM_TYPES.TEXT,
      title: 'Donate',
      description: messageData.text,
      image: {
        url: imageUrl,
        height: 256,
        width: 256,
      },
      message: messageData,
    };
  }

  createDonateMessage(): TSenderMessageContent {
    return {
      text:
        'Support the project and cover the costs of the server and cookies 🍪',
      buttons: [[this.createDonateButton()]],
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

  playSongMessage(message: Message): TSenderMessageContent {
    return {
      text: 'Yeah 🤟',
    };
  }

  addSongToQueueMessage(message: Message): TSenderMessageContent {
    return {
      text: 'Track added to queue 🤟',
    };
  }

  previousSongMessage(message: Message): TSenderMessageContent {
    return {
      text: 'Yeah 🤟',
    };
  }

  nextSongMessage(message: Message): TSenderMessageContent {
    return {
      text: 'Yeah 🤟',
    };
  }

  addedToFavoriteMessage(message: Message): TSenderMessageContent {
    return {
      text: 'Added to liked songs ❤️',
    };
  }

  removedFromFavoriteMessage(message: Message): TSenderMessageContent {
    return {
      text: 'Removed from liked songs 💔',
    };
  }

  private createCurrentPlayingBase(
    message: Message,
    data: ShareSongData,
    config: ShareSongConfig = {},
  ): TSenderMessageContent {
    const { track, songWhip } = data;
    const buttons = this.createTrackButtons(message, data, config);
    const textMessage = this.createCurrentPlayingMentionedTextMessage(
      message,
      data,
      config,
    );

    return {
      image: {
        url:
          track.thumb_url ||
          songWhip?.image ||
          `${this.appConfig.get<string>('SITE')}/images/123.jpg`,
        width: track.thumb_width,
        height: track.thumb_height,
      },
      text: textMessage.text,
      parseMode: textMessage.parseMode,
      buttons,
    };
  }
}
