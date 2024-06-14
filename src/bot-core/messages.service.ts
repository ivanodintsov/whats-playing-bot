import * as R from 'ramda';
import { ConfigService } from '@nestjs/config';
import { Message } from './message/message';
import {
  SEARCH_ITEM_TYPES,
  TButton,
  TButtonLink,
  TSenderMessageContent,
  TSenderSongSearchItem,
  TSenderTextSearchItem,
} from './sender.service';
import { ShareSongConfig, ShareSongData } from './types';
import { ACTIONS } from './constants';
import { ITrack } from 'src/songs-info/types/parser';
import { LinksService } from 'src/songs-info/links/links.service';
import { SongsInfoService } from 'src/songs-info/songs-info.service';

const pointFreeUpperCase: (x0: any) => string = R.compose(
  R.join(''),
  R.juxt([R.compose(R.toUpper, R.head), R.tail]),
);

export abstract class AbstractMessagesService {
  protected abstract readonly appConfig: ConfigService;
  protected abstract readonly linksService: LinksService;
  protected abstract readonly songsInfoService: SongsInfoService;

  getSignUpMessage(message: Message): TSenderMessageContent {
    return {
      text: 'Please sign up and let the magic happens 💫',
    };
  }

  getSpotifySignUpButton(message: Message, token: string): TButtonLink {
    const site = this.appConfig.get<string>('FRONTEND_URL');

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
    const { track, trackInfo } = data;

    let { links } = this.createSongLinks({ song: trackInfo });
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
        (item: { name: string; link: string }): TButton => ({
          text: item.name,
          url: item.link,
        }),
        links,
      );
    
      const moreLinksButton: TButton = {
        text: 'More Links',
        url: `https://t.me/whats_playing_bot/links?startapp=${btoa(JSON.stringify({
          type: 'track',
          id: this.songsInfoService.createSongId(trackInfo)
        }))}`,
      };

      linksButtons.push(moreLinksButton);

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

  createDonateSearchItem(message: Message): TSenderTextSearchItem {
    const messageData = this.createDonateMessage(message);
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

  createDonateMessage(message: Message): TSenderMessageContent {
    return {
      text:
        'Support the project and cover the costs of the server and cookies 🍪',
      buttons: [[this.createDonateButton()]],
    };
  }

  private createControlButtons(): TButton[] {
    return [
      {
        text: ACTIONS.PREVIOUS_2,
      },
      {
        text: ACTIONS.TOGGLE_PLAY,
      },
      {
        text: ACTIONS.NEXT_2,
      },
      {
        text: ACTIONS.SHARE_SONG,
      },
    ];
  }

  enableKeyboard(message: Message): TSenderMessageContent {
    return {
      text: 'Keyboard enabled',
      description: 'Control your vibe 🤤',
      buttons: [this.createControlButtons()],
    };
  }

  disableKeyboard(message: Message): TSenderMessageContent {
    return {
      text: 'Keyboard disabled',
    };
  }

  unlinkService(message: Message): TSenderMessageContent {
    return {
      text: 'Your account has been successfully unlinked',
      parseMode: 'Markdown',
    };
  }

  historyMessage(message: Message): TSenderMessageContent {
    const url = `${this.appConfig.get<string>('FRONTEND_URL')}/chats/${
      message.chat.id
    }`;

    return {
      text: url,
    };
  }

  connectedSuccessfullyMessage() {
    return {
      text:
        'Spotify connected successfully. Type /share command to the text box below and you will see the magic 💫',
    };
  }

  noTrackSearchItem(message: Message): TSenderTextSearchItem {
    return {
      type: SEARCH_ITEM_TYPES.TEXT,
      action: ACTIONS.NOT_PLAYING,
      title: 'Nothing is playing right now ☹️',
      image: {
        url: this.appConfig.get<string>('BOT_LOGO_IMAGE'),
      },
      message: {
        text: `Nothing is playing right now ☹️`,
        parseMode: 'Markdown',
      },
    };
  }

  noTrackMessage(message: Message): TSenderMessageContent {
    return {
      text: 'Nothing is playing right now ☹️',
    };
  }

  noConnectedMusicServiceMessage(message: Message): TSenderMessageContent {
    return {
      text: `You should connect Spotify account.`,
    };
  }

  noMusicServiceSubscriptionMessage(message: Message): TSenderMessageContent {
    return {
      text: `This command requires Spotify Premium ☹️`,
    };
  }

  underMaintenanceMessage(message: Message): TSenderMessageContent {
    return {
      text: `🥲 Service is currently under maintenance please try again later`,
    };
  }

  underMaintenanceMessageActionAnswer(message: Message): TSenderMessageContent {
    return {
      text: `🥲 Service is currently under maintenance please try again later`,
    };
  }

  maintenanceSearchItem(message: Message): TSenderTextSearchItem {
    return {
      type: SEARCH_ITEM_TYPES.TEXT,
      action: ACTIONS.MAINTENANCE,
      title: '🥲 Service is currently under maintenance please try again later',
      image: {
        url: this.appConfig.get<string>('BOT_LOGO_IMAGE'),
      },
      message: {
        text: `🥲 Service is currently under maintenance please try again later`,
        parseMode: 'Markdown',
      },
    };
  }

  expiredMusicServiceMessage(message: Message): TSenderMessageContent {
    return {
      text: `You should reconnect Spotify account.`,
    };
  }

  private createSongLinks({
    song,
  }: {
    song: ITrack;
  }): {
    links?: { name: string; link: string }[];
    image?: string;
  } {
    try {
      const pickProviders: Record<string, { name?: string }> = {
        tidal: {},
        itunes: {
          name: 'iTunes',
        },
        spotify: {},
        youtubeMusic: {
          name: 'Youtube Music',
        },
      };

      const createdLinks: Record<string, boolean> = {};

      const links = song.links
        .map(linkItem => {
          if (createdLinks[linkItem.provider]) {
            return;
          }

          createdLinks[linkItem.provider] = true;

          const providerConfig = pickProviders[linkItem.provider];

          if (!providerConfig) {
            return;
          }

          const link: { name: string; link: string } = {
            name: '',
            link: '',
          };

          link.link = `https://t.me/whats_playing_bot/links?startapp=${btoa(JSON.stringify({
            type: 'track-platform',
            service: linkItem.provider,
            id: this.songsInfoService.createSongId(song)
          }))}`;

          if (providerConfig.name) {
            link.name = providerConfig.name;
          } else {
            link.name = pointFreeUpperCase(linkItem.provider);
          }

          return link;
        })
        .filter(el => el);

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

  createSpotifyProfileMessage(
    message: Message,
    spotifyProfile: any,
  ): TSenderMessageContent {
    const username = spotifyProfile.display_name || message.from.firstName;

    return {
      text: `${username} Spotify Profile - ${spotifyProfile?.external_urls?.spotify}`,
    };
  }

  getSignUpActionAnswerMessage(message: Message): TSenderMessageContent {
    return {
      text: 'You should connect Spotify account',
    };
  }

  getNoTrackAnswerMessage(message: Message): TSenderMessageContent {
    return {
      text: 'Nothing is playing right now ☹️',
    };
  }

  getNoMusicServiceSubscriptionActionAnswer(
    message: Message,
  ): TSenderMessageContent {
    return {
      text: 'This command requires Spotify Premium ☹️',
    };
  }

  getNoActiveDevicesActionAnswer(message: Message): TSenderMessageContent {
    return {
      text: 'No active devices 😒',
    };
  }

  privateOnlyMessage(message: Message): TSenderMessageContent {
    return {
      text: `The command for private messages only`,
    };
  }

  private createCurrentPlayingBase(
    message: Message,
    data: ShareSongData,
    config: ShareSongConfig = {},
  ): TSenderMessageContent {
    const { track, trackInfo } = data;
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
          trackInfo?.album?.image?.url ||
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
