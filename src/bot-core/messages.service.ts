import * as R from 'ramda';
import { ConfigService } from '@nestjs/config';
import { Message, MESSAGE_TYPES } from './message/message';
import {
  SEARCH_ITEM_TYPES,
  TButton,
  TButtonCallback,
  TButtonLink,
  TSenderMessageContent,
  TSenderSongSearchItem,
  TSenderTextSearchItem,
} from './sender.service';
import {
  ShareSongConfig,
  ShareSongData,
  TelegramCreateConnectUrlOptions,
} from './types';
import { ACTIONS } from './constants';
import { ITrack } from 'src/music-services/music-service-core/types';
import { LinksService } from 'src/songs-info/links/links.service';
import { SongsInfoService } from 'src/songs-info/songs-info.service';
import {
  ProfileResponse,
  ToggleFavoriteResponse,
} from 'src/music-services/music-service-core/types';
import {
  AbstractMusicServices,
  AggregatorResponse,
} from 'src/music-services/music-service-core/music-service-core.service';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';
import {
  INTERNAL_MUSIC_SERVICE_PROVIDER,
  MUSIC_SERVICE_PROVIDER_NAMES,
  MUSIC_SERVICE_PROVIDERS,
  MusicServiceConfig,
} from 'src/constants';
import { TOGGLE_ACTIONS } from 'src/music-services/music-service-core/constants';

const pointFreeUpperCase: (x0: any) => string = R.compose(
  R.join(''),
  R.juxt([R.compose(R.toUpper, R.head), R.tail]),
);

export abstract class AbstractMessagesService {
  protected abstract readonly appConfig: ConfigService;
  protected abstract readonly linksService: LinksService;
  protected abstract readonly songsInfoService: SongsInfoService;
  protected abstract readonly musicServices: AbstractMusicServices;

  // TODO create separate service
  protected abstract readonly PREMIUM_USERS: Record<string, boolean>;

  getSignUpMessage(message: Message): TSenderMessageContent {
    return {
      text: 'Please sign up and let the magic happens 💫',
    };
  }

  getManageMusicConnectionsMessage(message: Message): TSenderMessageContent {
    return {
      text: 'Manage your connected music services. 💫\nChoose a service below to connect or disconnect.',
    };
  }

  getSpotifySignUpButton(message: Message, token: string): TButtonLink {
    const site = this.appConfig.get<string>('CONNECT_SERVICE_URL');

    return {
      text: 'Sign up with Spotify',
      url: `${site}/telegram/bot?t=${token}`,
    };
  }

  getMusicServiceSignUpButtons(
    message: Message,
    user: TelegramUser,
    connectedMusicServices: MUSIC_SERVICE_PROVIDERS[],
  ): (TButtonLink | TButtonCallback)[][] {
    const musicServices = Object.values(this.musicServices.services);

    return [
      musicServices.map<TButtonLink | TButtonCallback>((service) => {
        const options: TelegramCreateConnectUrlOptions = {
          platform: message.providerUnique,
          platformInstance: message.provider,
          service: service.type,
          id: user.tg_id,
          chatId: message.chat?.id,
          userId: user.id,
        };

        const isConnected = connectedMusicServices.includes(service.type);

        if (isConnected) {
          return {
            text: `Disconnect ${service.serviceName}`,
            callbackData: `${ACTIONS.DISCONNECT_MUSIC_SERVICE}:${service.type}`,
          };
        }

        return {
          text: `Connect ${service.serviceName}`,
          url: this.musicServices.createPlatformConnectURL(options),
        };
      }),
    ];
  }

  getSpotifyAlreadyConnectedMessage(message: Message): TSenderMessageContent {
    return {
      text: 'You are already connected to Spotify. Type /share command to the text box below and you will see the magic 💫',
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
    const trackString = [data.track.name, data.track.artists]
      .filter(Boolean)
      .join(' - ');

    if (config.share) {
      return {
        text: `Listen to ${trackString}`,
      };
    }

    if (config.anonymous) {
      return {
        text: `You are listening now: ${trackString}`,
      };
    }

    return {
      text: `${username} is listening now: ${trackString}`,
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
    const isPremium =
      message.type !== MESSAGE_TYPES.ACTION &&
      message.type !== MESSAGE_TYPES.SERVICE &&
      // TODO create separate service
      this.PREMIUM_USERS[message.from.id];

    let { links } = this.createSongLinks({
      song: trackInfo,
      directLinks: isPremium,
    });
    const uri = track.uri;

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

    let linksButtons = [];

    if (links.length) {
      linksButtons = R.map(
        (item: { name: string; link: string }): TButton => ({
          text: item.name,
          url: item.link,
        }),
        links,
      );

      const moreLinksButton: TButton = {
        text: 'More Links',
        url: `https://t.me/${this.appConfig.get<string>('TELEGRAM_BOT_NAME')}/links?startapp=${btoa(
          JSON.stringify({
            type: 'track',
            id: this.songsInfoService.createShortSongId(trackInfo),
          }),
        )}`,
      };

      linksButtons.push(moreLinksButton);
    }

    if (donate) {
      const donateButton = this.createDonateButton();
      donateButton.text = '💳 🍪';

      linksButtons.push(donateButton);
    }

    buttons = [...buttons, ...R.splitEvery(3)(linksButtons)];

    return buttons;
  }

  createShareSearchItem(
    message: Message,
    data: ShareSongData,
    config: ShareSongConfig = {},
  ): TSenderSongSearchItem {
    const messageData = this.createCurrentPlayingBase(message, data, config);
    const { track } = data;

    if (data.track.provider === INTERNAL_MUSIC_SERVICE_PROVIDER) {
      const donateMessage = this.createDonateSearchItem(message);
      return {
        action: 'WOWOWOWOWOW',
        type: SEARCH_ITEM_TYPES.SONG,
        title: `Wow you see this message!`,
        description: `I don't know what's going on =(`,
        image: donateMessage.image,
        message: donateMessage.message,
      };
    }
    const serviceName =
      this.musicServices.services[data.track.provider].serviceName;

    return {
      action: `${ACTIONS.NOW_PLAYING}${data.track.uri}`,
      type: SEARCH_ITEM_TYPES.SONG,
      title: `Now Playing on ${serviceName}`,
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
      action: `${ACTIONS.SPOTIFY_SEARCH}${data.track.uri}`,
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
      text: 'Support the project and cover the costs of the server and cookies 🍪',
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

  connectedSuccessfullyMessage({
    musicServiceName,
  }: {
    musicServiceName: string;
  }) {
    return {
      text: `${musicServiceName} connected successfully. Type /share command to the text box below and you will see the magic 💫`,
    };
  }

  musicServiceConnectionFailureMessage({
    serviceName,
  }: {
    serviceName: string;
  }) {
    return {
      text: `Failed to connect to ${serviceName}. Please try connecting again using the /start command.`,
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
      },
    };
  }

  expiredMusicServiceMessage(message: Message): TSenderMessageContent {
    return {
      text: `You should reconnect Spotify account.`,
    };
  }

  private createSongLinks({
    directLinks,
    song,
  }: {
    directLinks?: boolean;
    song: ITrack;
  }): {
    links?: { name: string; link: string }[];
    image?: string;
  } {
    try {
      const pickProviders: Record<string, { name?: string }> = [
        MUSIC_SERVICE_PROVIDER_NAMES.SPOTIFY,
        MUSIC_SERVICE_PROVIDER_NAMES.SOUNDCLOUD,
        'tidal',
        'itunes',
        'youtubeMusic',
      ].reduce(
        (acc, type) => ({
          ...acc,
          [type]: MusicServiceConfig[type],
        }),
        {},
      );
      const pickedLinks = song.links.reduce(
        (acc, linkItem) => {
          if (acc[linkItem.provider]) {
            return acc;
          }

          const providerConfig = pickProviders[linkItem.provider];

          if (!providerConfig) {
            return acc;
          }

          const link: { name: string; link: string } = {
            name: '',
            link: '',
          };

          if (directLinks) {
            link.link = linkItem.providerUrl;
          } else {
            link.link = `https://t.me/${this.appConfig.get<string>('TELEGRAM_BOT_NAME')}/links?startapp=${btoa(
              JSON.stringify({
                type: 'track-platform',
                service: linkItem.provider,
                id: this.songsInfoService.createShortSongId(song),
              }),
            )}`;
          }

          if (providerConfig.name) {
            link.name = providerConfig.name;
          } else {
            link.name = pointFreeUpperCase(linkItem.provider);
          }

          return {
            ...acc,
            [linkItem.provider]: link,
          };
        },
        {} as Record<string, { name: string; link: string }>,
      );

      const links = Object.keys(pickProviders)
        .map((provider) => {
          return pickedLinks[provider];
        })
        .filter(Boolean);

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

  toggleFavoriteMessage(
    message: Message,
    toggleList: AggregatorResponse<ToggleFavoriteResponse>,
  ): TSenderMessageContent {
    if (toggleList.length === 1) {
      const toggle = toggleList[0];

      if (toggle.response.action === TOGGLE_ACTIONS.SAVED) {
        return this.addedToFavoriteMessage(message);
      }

      if (toggle.response.action === TOGGLE_ACTIONS.REMOVED) {
        return this.removedFromFavoriteMessage(message);
      }

      return {
        text: 'What!',
      };
    }

    const messageText = toggleList
      .map((toggle) => {
        const serviceName =
          this.musicServices.services[toggle.type].serviceName;

        if (toggle.response.action === TOGGLE_ACTIONS.SAVED) {
          return `Added to ${serviceName} ❤️`;
        }

        if (toggle.response.action === TOGGLE_ACTIONS.REMOVED) {
          return `Removed from ${serviceName} 💔`;
        }

        return '';
      })
      .join('\n');

    return {
      text: messageText,
    };
  }

  createSpotifyProfileMessage(
    message: Message,
    profile: {
      type: MUSIC_SERVICE_PROVIDERS;
      response: ProfileResponse;
    },
  ): TSenderMessageContent {
    const musicServices = this.musicServices.services;
    const username = profile.response.username || message.from.firstName;

    return {
      text: `${username} ${musicServices[profile.type].serviceName} Profile - ${profile.response.url}`,
    };
  }

  createProfilesMessage(
    message: Message,
    profileList: {
      type: MUSIC_SERVICE_PROVIDERS;
      response: ProfileResponse;
    }[],
  ): TSenderMessageContent {
    const messages = profileList.map((profile) =>
      this.createSpotifyProfileMessage(message, profile),
    );

    return {
      text: messages.map((message) => message.text).join('\n'),
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

  getNotSupportedByServiceActionAnswer(
    message: Message,
  ): TSenderMessageContent {
    return {
      text: 'Not supported by your music service 😒',
    };
  }

  getSomethingWentWrongActionAnswer(message: Message): TSenderMessageContent {
    return {
      text: 'Something went wrong please try again later 😒',
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
          `${this.appConfig.get<string>('SITE')}${this.appConfig.get<string>('DEFAULT_COVER_IMAGE')}`,
        width: track.thumb_width,
        height: track.thumb_height,
      },
      buttons,
      ...textMessage,
    };
  }
}
