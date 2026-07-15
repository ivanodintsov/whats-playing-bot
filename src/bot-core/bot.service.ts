import * as crypto from 'crypto';
import Redis from 'ioredis';
import { LoggerService } from '@nestjs/common';
import { Queue } from 'bull';
import {
  AddSongToQueueJobData,
  DisconnectMusicServiceJobData,
  GetProfileJobData,
  NextSongActionJobData,
  NextSongJobData,
  PlaySongJobData,
  PreviousSongActionJobData,
  PreviousSongJobData,
  SearchJobData,
  ShareQueueJobData,
  ShareSongJobData,
  SignUpJobData,
  ToggleFavoriteJobData,
  TogglePlayJobData,
  UnlinkServiceJobData,
  UpdateShareJobData,
} from 'src/bot-core/bot.processor';
import { ActionErrorsHandler } from './action.error-handler';
import { ACTIONS } from './constants';
import { MaintenanceError, PrivateOnlyError, UserExistsError } from './errors';
import { MessageErrorsHandler } from './message.error-handler';
import { CHAT_TYPES, DumbMessage, Message } from './message/message';
import { AbstractMessagesService } from './messages.service';
import { SearchErrorHandler } from './search.error-handler';
import {
  Sender,
  TSenderSearchItem,
  TSenderSearchOptions,
} from './sender.service';
import {
  BotMethodOptions,
  MusicServiceData,
  ShareSongConfig,
  ShareSongData,
} from './types';
import { SongsInfoService } from 'src/songs-info/songs-info.service';
import { TrackStatisticsService } from 'src/songs-info/track-statistics/track-statistics.service';
import { TrackPlaylistService } from 'src/track-playlist/track-playlist.service';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';
import { ConfigService } from '@nestjs/config';
import { GA4Service } from 'src/utils/ga4/ga4.service';
import {
  CLIENT_UNIQUE_PROVIDES,
  INTERNAL_MUSIC_SERVICE_PROVIDER,
  MUSIC_SERVICE_PROVIDERS,
  MUSIC_SERVICE_PROVIDERS_BY_NAME,
} from 'src/constants';
import { MusicServicesService } from 'src/music-services/music-services.service';
import { ITrack } from 'src/music-services/music-service-core/types';
import { MusicServicesUriParserService } from 'src/music-services/music-services-uri-parser/music-services-uri-parser.service';
import { ParserMergeUtils } from 'src/songs-info/parser/parser-merge-utils';
import { ParserMusicServiceURL } from 'src/songs-info/types/parser';
import { TrackEntity } from 'src/music-services/domain/Track';
import { isDefined } from 'src/utils/isDefined';
import { TokensPoolService } from 'src/songs-info/tokens-pool/tokens-pool.service';
import { MusicServicesConnectContext } from 'src/music-services/types';
import { SongsService } from 'src/songs-info/songs/songs.service';
import { normalizeBotMethodOptions } from './utils';

export abstract class AbstractBotService {
  type: CLIENT_UNIQUE_PROVIDES.TELEGRAM = CLIENT_UNIQUE_PROVIDES.TELEGRAM;

  protected abstract readonly musicServices: MusicServicesService;
  public abstract readonly sender: Sender;
  protected abstract readonly queue: Queue<ShareQueueJobData>;
  protected abstract readonly logger: LoggerService;
  protected abstract readonly songsInfoService: SongsInfoService;
  protected abstract readonly messagesService: AbstractMessagesService;
  protected abstract readonly trackStatisticService: TrackStatisticsService;
  protected abstract readonly trackPlaylistService: TrackPlaylistService;
  protected abstract readonly appConfig: ConfigService;
  protected abstract readonly gaService: GA4Service;
  protected abstract readonly redis: Redis;
  protected abstract readonly tokensPoolService: TokensPoolService;
  protected abstract readonly songService: SongsService;

  protected abstract createUser(message: Message): Promise<TelegramUser>;
  protected abstract getUser(
    message: Pick<Message, 'from'>,
  ): Promise<TelegramUser>;

  public abstract sendSongToChats(
    message: Message,
    data: ShareSongData,
    config: ShareSongConfig,
  ): Promise<any>;

  @MessageErrorsHandler()
  async signUpProcess(message: Message) {
    await this.musicServicesConnectionsManagement(message, 'SIGN_IN');

    try {
      await this.gaService.send(
        [
          {
            name: 'sign_up_bot',
            params: {
              platform: 'telegram',
              engagement_time_msec: '100',
              session_id: message?.chat.id,
            },
          },
        ],
        {
          non_personalized_ads: true,
        },
      );
    } catch (error) {
      this.logger.debug(error.message, error.stack, 'ga4');
    }
  }

  private async musicServicesConnectionsManagement(
    message: Message,
    type: 'SIGN_IN' | 'MANAGE_MUSIC_CONNECTION',
  ) {
    const { chat } = message;

    if (chat.type !== CHAT_TYPES.PRIVATE) {
      throw new PrivateOnlyError();
    }

    try {
      const user = await this.createUser(message);
      const musicServiceContext =
        await this.generateMusicServiceContext(message);
      const internalService =
        await this.musicServices.connectToInternal(musicServiceContext);
      const connectedMusicServiceTypesList =
        await internalService.getAllConnectedServiceTypes();

      let messageContent;

      if (type === 'SIGN_IN') {
        messageContent = this.messagesService.getSignUpMessage(message);
      } else if (type === 'MANAGE_MUSIC_CONNECTION') {
        messageContent =
          this.messagesService.getManageMusicConnectionsMessage(message);
      } else {
        throw new Error('NO TYPE');
      }

      await this.sender.sendMessage({
        chatId: chat.id,
        text: messageContent.text,
        buttons: this.messagesService.getMusicServiceSignUpButtons(
          message,
          user,
          connectedMusicServiceTypesList,
        ),
      });
    } catch (error) {
      this.logger.debug(error.message, error.stack, error, message);

      if (error instanceof UserExistsError) {
        const messageContent =
          this.messagesService.getSpotifyAlreadyConnectedMessage(message);

        await this.sender.sendMessage({
          chatId: chat.id,
          ...messageContent,
        });
      } else {
        throw error;
      }
    }
  }

  @ActionErrorsHandler()
  async disconnectMusicServiceProcess(message: Message) {
    if (message.chatType !== CHAT_TYPES.PRIVATE) {
      throw new PrivateOnlyError();
    }

    const regexp = new RegExp(
      `${ACTIONS.DISCONNECT_MUSIC_SERVICE}:(?<musicServiceType>.*)$`,
    );
    const match = message.text?.match(regexp);
    const musicServiceType: MUSIC_SERVICE_PROVIDERS =
      MUSIC_SERVICE_PROVIDERS[
        MUSIC_SERVICE_PROVIDERS[parseInt(match.groups.musicServiceType, 10)]
      ];

    const user = await this.createUser(message);
    const musicServiceContext = await this.generateMusicServiceContext(message);
    const musicServiceConnection = await this.musicServices.connect(
      musicServiceType,
      musicServiceContext,
    );
    await musicServiceConnection.service.logout();

    {
      const internalService =
        await this.musicServices.connectToInternal(musicServiceContext);
      const connectedMusicServiceTypesList =
        await internalService.getAllConnectedServiceTypes();
      const signUpMessage = this.messagesService.getSignUpMessage(message);

      await this.sender.editMessage(message.message, {
        ...signUpMessage,
        buttons: this.messagesService.getMusicServiceSignUpButtons(
          message,
          user,
          connectedMusicServiceTypesList,
        ),
      });
    }

    const messageData = this.messagesService.unlinkService(message);
    await this.sender.answerToAction({
      chatId: message.id,
      ...messageData,
    });
  }

  @ActionErrorsHandler()
  async disconnectMusicService(message: Message) {
    const jobData: DisconnectMusicServiceJobData = {
      message,
    };

    await this.queue.add('disconnectMusicService', jobData, {
      attempts: 5,
      removeOnComplete: true,
      priority: 1,
    });
  }

  @MessageErrorsHandler()
  async signUp(message: Message) {
    const jobData: SignUpJobData = {
      message,
    };

    await this.queue.add('signUp', jobData, {
      attempts: 5,
      removeOnComplete: true,
      priority: 1,
    });
  }

  @MessageErrorsHandler()
  async shareSong(message: Message, _config?: ShareSongConfig) {
    const config = normalizeBotMethodOptions(_config);
    const jobData: ShareSongJobData = {
      message,
      config,
    };

    await this.queue.add('shareSong', jobData, {
      attempts: 5,
      removeOnComplete: true,
      priority: 1,
    });
  }

  @MessageErrorsHandler()
  async shareSongWithoutControls(message: Message) {
    await this.shareSong(message, {
      control: false,
      loading: false,
    });
  }

  async updateShareSong(
    message: Message,
    messageToUpdate: Message,
    data: ShareSongData,
    _config: ShareSongConfig,
    musicService: MusicServiceData,
  ) {
    const config = normalizeBotMethodOptions(_config);
    try {
      const jobData: UpdateShareJobData = {
        message,
        messageToUpdate,
        data,
        config,
        musicService,
      };

      await this.queue.add('updateShare', jobData, {
        attempts: 5,
        removeOnComplete: true,
        priority: 1,
      });
    } catch (error) {
      this.logger.debug(
        error.message,
        error.stack,
        'this.sender.updateShareSong',
      );
    }
  }

  trackToTrackEntity(
    track: ITrack,
    type: MUSIC_SERVICE_PROVIDERS | INTERNAL_MUSIC_SERVICE_PROVIDER,
  ): TrackEntity {
    const artistsList = track.artists || [];
    const artistsString = artistsList.map((artist) => artist.name).join(', ');
    const link = track.links.find((link) => {
      return isDefined(MUSIC_SERVICE_PROVIDERS_BY_NAME[link.provider]);
    });
    const uriParser = MusicServicesUriParserService.createUri(link, type);

    const trackEntity = new TrackEntity({
      id: track.id,
      name: track.name || '',
      uri: uriParser.toString(),
      url: link.providerUrl,
      thumb_url: track.album.image?.url,
      thumb_width: track.album.image?.width,
      thumb_height: track.album.image?.height,
      artists: !!artistsString.length ? artistsString : null,
      provider: type,
    });

    return trackEntity;
  }

  @MessageErrorsHandler()
  async processShare(message: Message, _config: ShareSongConfig) {
    const config = normalizeBotMethodOptions(_config);
    const musicServiceContext = await this.generateMusicServiceContext(message);
    const musicService =
      await this.musicServices.connectToInternal(musicServiceContext);
    const tracks = await musicService.getCurrentTrack();
    const trackResponse = tracks[0];
    const track = this.trackToTrackEntity(
      trackResponse.response,
      trackResponse.type,
    );

    const messageData = this.messagesService.createCurrentPlaying(
      message,
      { track },
      config,
    );

    const messageResponse = await this.sender.sendShare({
      chatId: message.chat.id,
      ...messageData,
    });

    const musicServiceData: MusicServiceData = {
      type: musicService.type,
    };

    await this.updateShareSong(
      message,
      messageResponse,
      { track },
      config,
      musicServiceData,
    );
  }

  async processUpdateShare(
    message: Message,
    messageToUpdate: Message,
    data: ShareSongData,
    _config: ShareSongConfig,
    musicService: MusicServiceData,
  ) {
    const config = normalizeBotMethodOptions(_config);

    try {
      const { track } = data;
      const trackInfo = await this.songsInfoService.getSongByTrackEntity(track);
      const trackEntity = ParserMergeUtils.mergeTrackEntity(
        track,
        this.trackToTrackEntity(trackInfo, INTERNAL_MUSIC_SERVICE_PROVIDER),
      );

      const messageData = this.messagesService.createCurrentPlaying(
        message,
        {
          ...data,
          track: trackEntity,
          trackInfo,
        },
        {
          ...config,
          loading: false,
        },
      );

      try {
        await this.sender.updateShare(messageData, messageToUpdate);
      } catch (error) {
        this.logger.debug(
          error.message,
          error.stack,
          'this.sender.updateShare',
        );
      }

      const jobData: UpdateShareJobData = {
        message,
        messageToUpdate,
        data: {
          ...data,
          track: trackEntity,
        },
        config,
        musicService,
      };
      await this.queue.add('updateShareWithSongwhip', jobData, {
        attempts: 2,
        removeOnComplete: true,
        priority: 1,
      });

      await this.trackStatisticService.shareInc(trackInfo.id);
      await this.addToPlaylist(message, {
        track,
        trackInfo,
      });
    } catch (error) {
      this.logger.debug(error.message, error.stack);
    }
  }

  async processUpdateShareWithSongWhip(
    message: Message,
    messageToUpdate: Message,
    data: ShareSongData,
    _config?: ShareSongConfig,
  ) {
    const config = normalizeBotMethodOptions(_config);

    try {
      const { track } = data;
      const trackInfo = await this.songsInfoService.updateFromSongWhipByTrackId(
        {
          trackId: track['id'],
          url: track.url,
        },
      );
      const trackEntity = ParserMergeUtils.mergeTrackEntity(
        track,
        this.trackToTrackEntity(trackInfo, INTERNAL_MUSIC_SERVICE_PROVIDER),
      );

      const messageData = this.messagesService.createCurrentPlaying(
        message,
        {
          ...data,
          track: trackEntity,
          trackInfo,
        },
        {
          ...config,
          loading: false,
        },
      );

      try {
        await this.sender.updateShare(messageData, messageToUpdate);
      } catch (error) {
        this.logger.debug(
          error.message,
          error.stack,
          'this.sender.processUpdateShareWithSongWhip',
        );
      }
    } catch (error) {
      this.logger.debug(error.message, error.stack);
    }
  }

  private async addToPlaylist(
    message: Message,
    { track, trackInfo }: ShareSongData,
  ) {
    try {
      const user = await this.getUser(message);
      const sharedTrack = await this.trackPlaylistService.addSong({
        providerUserId: user.id,
        provider: message.provider,
        trackId: trackInfo.id,
        chat_id: message.chat?.id,
      });

      return sharedTrack;
    } catch (error) {
      this.logger.debug(error.message, error.stack);
    }
  }

  @MessageErrorsHandler()
  async processActionMessage(message: Message) {
    if (message.text.startsWith(ACTIONS.NOW_PLAYING)) {
      await this.onShareActionMessage(message);
    }

    if (message.text.startsWith(ACTIONS.SPOTIFY_SEARCH)) {
      await this.onSearchActionMessage(message);
    }
  }

  @SearchErrorHandler()
  async search(message: Message) {
    const jobData: SearchJobData = {
      message,
    };

    await this.queue.add('inlineQuery', jobData, {
      attempts: 5,
      removeOnComplete: true,
    });
  }

  @ActionErrorsHandler()
  async playSongProcess(message: Message) {
    const regexp = new RegExp(
      `${ACTIONS.PLAY_ON_SPOTIFY}(?<musicServiceUri>.*)$`,
    );
    const match = message.text?.match(regexp);
    const parsedUri = MusicServicesUriParserService.parseUri(
      match.groups.musicServiceUri,
    ).uri;

    const musicServiceContext = await this.generateMusicServiceContext(message);
    const musicService =
      await this.musicServices.connectToInternal(musicServiceContext);
    await musicService.playSong({
      uri: parsedUri,
    });

    const messageData = this.messagesService.playSongMessage(message);

    await this.sender.answerToAction({
      chatId: message.id,
      ...messageData,
    });
  }

  @ActionErrorsHandler()
  async playSong(message: Message) {
    const jobData: PlaySongJobData = {
      message,
    };

    await this.queue.add('playSong', jobData, {
      attempts: 5,
      removeOnComplete: true,
      priority: 1,
    });
  }

  @ActionErrorsHandler()
  async addSongToQueue(message: Message) {
    const jobData: AddSongToQueueJobData = {
      message,
    };

    await this.queue.add('addSongToQueue', jobData, {
      attempts: 5,
      removeOnComplete: true,
      priority: 1,
    });
  }

  @ActionErrorsHandler()
  async addSongToQueueProcess(message: Message) {
    const regexp = new RegExp(
      `${ACTIONS.ADD_TO_QUEUE_SPOTIFY}(?<musicServiceUri>.*)$`,
    );
    const match = message.text?.match(regexp);
    const parsedUri = MusicServicesUriParserService.parseUri(
      match.groups.musicServiceUri,
    ).uri;

    const musicServiceContext = await this.generateMusicServiceContext(message);
    const musicService =
      await this.musicServices.connectToInternal(musicServiceContext);
    await musicService.addToQueue({ uri: parsedUri });

    const messageData = this.messagesService.addSongToQueueMessage(message);

    await this.sender.answerToAction({
      chatId: message.id,
      ...messageData,
    });
  }

  @MessageErrorsHandler()
  async previousSongProcess(message: Message, options: BotMethodOptions) {
    const normalizedOptions = normalizeBotMethodOptions(options);
    await this._previousSong(message);

    if (normalizedOptions.withAnswer) {
      await this.sender.sendPreviousTrackSuccess(message);
    }
  }

  @MessageErrorsHandler()
  async previousSong(message: Message, options?: BotMethodOptions) {
    const normalizedOptions = normalizeBotMethodOptions(options);
    const jobData: PreviousSongJobData = {
      message,
      options: normalizedOptions,
    };

    await this.queue.add('previousSong', jobData, {
      attempts: 5,
      removeOnComplete: true,
      priority: 1,
    });
  }

  @ActionErrorsHandler()
  async previousSongActionProcess(message: Message) {
    await this._previousSong(message);

    const messageData = this.messagesService.previousSongMessage(message);

    await this.sender.answerToAction({
      chatId: message.id,
      ...messageData,
    });
  }

  @ActionErrorsHandler()
  async previousSongAction(message: Message) {
    const jobData: PreviousSongActionJobData = {
      message,
    };

    await this.queue.add('previousSongAction', jobData, {
      attempts: 5,
      removeOnComplete: true,
      priority: 1,
    });
  }

  @MessageErrorsHandler()
  async nextSongProcess(message: Message, options: BotMethodOptions) {
    const normalizedOptions = normalizeBotMethodOptions(options);
    await this._nextSong(message);

    if (normalizedOptions.withAnswer) {
      await this.sender.sendNextTrackSuccess(message);
    }
  }

  @MessageErrorsHandler()
  async nextSong(message: Message, options?: BotMethodOptions) {
    const normalizedOptions = normalizeBotMethodOptions(options);
    const jobData: NextSongJobData = {
      message,
      options: normalizedOptions,
    };

    await this.queue.add('nextSong', jobData, {
      attempts: 5,
      removeOnComplete: true,
      priority: 1,
    });
  }

  @ActionErrorsHandler()
  async nextSongActionProcess(message: Message) {
    await this._nextSong(message);

    const messageData = this.messagesService.nextSongMessage(message);

    await this.sender.answerToAction({
      chatId: message.id,
      ...messageData,
    });
  }

  @ActionErrorsHandler()
  async nextSongAction(message: Message) {
    const jobData: NextSongActionJobData = {
      message,
    };

    await this.queue.add('nextSongAction', jobData, {
      attempts: 5,
      removeOnComplete: true,
      priority: 1,
    });
  }

  @MessageErrorsHandler()
  async togglePlayProcess(message: Message, options: BotMethodOptions) {
    const normalizedOptions = normalizeBotMethodOptions(options);
    const musicServiceContext = await this.generateMusicServiceContext(message);
    const musicService =
      await this.musicServices.connectToInternal(musicServiceContext);
    await musicService.togglePlay();

    if (normalizedOptions.withAnswer) {
      await this.sender.sendTogglePlaySuccess(message);
    }
  }

  @MessageErrorsHandler()
  async togglePlay(message: Message, options: BotMethodOptions) {
    const normalizedOptions = normalizeBotMethodOptions(options);
    const jobData: TogglePlayJobData = {
      message,
      options: normalizedOptions,
    };

    await this.queue.add('togglePlay', jobData, {
      attempts: 5,
      removeOnComplete: true,
      priority: 1,
    });
  }

  @SearchErrorHandler()
  async processSearch(message: Message) {
    if (message.text) {
      await this.onSearch(message);
    } else {
      await this.onEmptySearch(message);
    }
  }

  @ActionErrorsHandler()
  async toggleFavoriteProcess(message: Message) {
    const regexp = new RegExp(
      `${ACTIONS.ADD_TO_FAVORITE}(?<musicServiceUri>.*)$`,
    );
    const match = message.text?.match(regexp);
    const parsedUri = MusicServicesUriParserService.parseUri(
      match.groups.musicServiceUri,
    );

    const musicServiceContext = await this.generateMusicServiceContext(message);
    const musicService =
      await this.musicServices.connectToInternal(musicServiceContext);
    const responses = await musicService.toggleFavorite({
      uris: [parsedUri.uri],
    });

    const messageData = this.messagesService.toggleFavoriteMessage(
      message,
      responses,
    );

    await this.sender.answerToAction({
      chatId: message.id,
      ...messageData,
    });
  }

  @ActionErrorsHandler()
  async toggleFavorite(message: Message) {
    const jobData: ToggleFavoriteJobData = {
      message,
    };

    await this.queue.add('toggleFavorite', jobData, {
      attempts: 5,
      removeOnComplete: true,
      priority: 1,
    });
  }

  @MessageErrorsHandler()
  async getProfileProcess(message: Message) {
    const musicServiceContext = await this.generateMusicServiceContext(message);
    const musicService =
      await this.musicServices.connectToInternal(musicServiceContext);
    const profiles = await musicService.getProfile();

    const messageData = this.messagesService.createProfilesMessage(
      message,
      profiles,
    );

    await this.sender.sendMessage({
      chatId: message.chat.id,
      ...messageData,
    });
  }

  @MessageErrorsHandler()
  async getProfile(message: Message) {
    const jobData: GetProfileJobData = {
      message,
    };

    await this.queue.add('getProfile', jobData, {
      attempts: 5,
      removeOnComplete: true,
      priority: 1,
    });
  }

  @MessageErrorsHandler()
  async donate(message: Message) {
    const messageData = this.messagesService.createDonateMessage(message);

    await this.sender.sendMessage({
      chatId: message.chat.id,
      ...messageData,
    });
  }

  @MessageErrorsHandler()
  async enableKeyboard(message: Message) {
    const messageData = this.messagesService.enableKeyboard(message);

    await this.sender.enableKeyboard(
      {
        chatId: message.chat.id,
        ...messageData,
      },
      message,
    );
  }

  @MessageErrorsHandler()
  async disableKeyboard(message: Message) {
    const messageData = this.messagesService.disableKeyboard(message);

    await this.sender.disableKeyboard(
      {
        chatId: message.chat.id,
        ...messageData,
      },
      message,
    );
  }

  @MessageErrorsHandler()
  async unlinkServiceProcess(message: Message) {
    await this.musicServicesConnectionsManagement(
      message,
      'MANAGE_MUSIC_CONNECTION',
    );

    try {
      await this.gaService.send(
        [
          {
            name: 'UNLINK_MUSIC_SERVICES',
            params: {
              platform: 'telegram',
              engagement_time_msec: '100',
              session_id: message?.chat.id,
            },
          },
        ],
        {
          non_personalized_ads: true,
        },
      );
    } catch (error) {
      this.logger.debug(error.message, error.stack, 'ga4');
    }
  }

  @MessageErrorsHandler()
  async connectServiceProcess(message: Message) {
    await this.musicServicesConnectionsManagement(
      message,
      'MANAGE_MUSIC_CONNECTION',
    );

    try {
      await this.gaService.send(
        [
          {
            name: 'CONNECT_MUSIC_SERVICE',
            params: {
              platform: 'telegram',
              engagement_time_msec: '100',
              session_id: message?.chat.id,
            },
          },
        ],
        {
          non_personalized_ads: true,
        },
      );
    } catch (error) {
      this.logger.debug(error.message, error.stack, 'ga4');
    }
  }

  @MessageErrorsHandler()
  async unlinkService(message: Message) {
    const jobData: UnlinkServiceJobData = {
      message,
    };

    await this.queue.add('unlinkService', jobData, {
      attempts: 2,
      removeOnComplete: true,
      priority: 1,
    });
  }

  @MessageErrorsHandler()
  async connectService(message: Message) {
    const jobData: UnlinkServiceJobData = {
      message,
    };

    await this.queue.add('connectService', jobData, {
      attempts: 2,
      removeOnComplete: true,
      priority: 1,
    });
  }

  @MessageErrorsHandler()
  async history(message: Message) {
    const messageData = this.messagesService.historyMessage(message);

    await this.sender.sendMessage({
      chatId: message.chat.id,
      ...messageData,
    });
  }

  protected async sendSongToChat(
    chatId: string,
    message: Message,
    { track }: ShareSongData,
    _config?: ShareSongConfig,
  ) {
    const config = normalizeBotMethodOptions(_config);

    try {
      const trackInfo = await this.songService.getTrackById(track.id);

      const messageData = this.messagesService.createCurrentPlaying(
        message,
        { track, trackInfo },
        {
          ...config,
          anonymous: true,
          control: false,
          donate: false,
          serviceChat: true,
        },
      );

      await this.sender.sendShare({
        chatId,
        ...messageData,
      });
    } catch (error) {
      this.logger.debug(error.message, error.stack);
    }
  }

  private async _previousSong(message: Message) {
    const musicServiceContext = await this.generateMusicServiceContext(message);
    const musicService =
      await this.musicServices.connectToInternal(musicServiceContext);
    await musicService.previousTrack();
  }

  private async _nextSong(message: Message) {
    const musicServiceContext = await this.generateMusicServiceContext(message);
    const musicService =
      await this.musicServices.connectToInternal(musicServiceContext);
    await musicService.nextTrack();
  }

  private async onSearch(message: Message) {
    const limit = '20';
    const cacheKeyPrefix = 'telegram_search:pagination:';

    const paginationCacheString = message.offset
      ? await this.redis.get(message.offset)
      : null;

    if (message.offset) {
      await this.redis.del(message.offset);
    }

    const pagination = JSON.parse(paginationCacheString);

    const musicServiceContext = await this.generateMusicServiceContext(message);
    const internalService =
      await this.musicServices.connectToInternal(musicServiceContext);
    const musicServiceConnection = await internalService.getService();
    const response = await musicServiceConnection.using(async (service) =>
      service.searchTracks({
        search: message.text,
        options: {
          pagination: {
            ...pagination,
            limit,
          },
        },
      }),
    );

    const items: TSenderSearchItem[] = [];

    let cacheKey: string | null = null;

    if (response.pagination.next) {
      while (!cacheKey) {
        const id = crypto.randomBytes(16).toString('base64url');
        const newCacheKey = `${cacheKeyPrefix}${id}`;

        const created = await this.redis.set(
          newCacheKey,
          JSON.stringify(response.pagination),
          'EX',
          5 * 60,
          'NX',
        );

        if (created === 'OK') {
          cacheKey = newCacheKey;
        }
      }
    }

    const options: TSenderSearchOptions = {
      nextOffset: cacheKey,
    };

    const songItemOptions: ShareSongConfig = {
      control: true,
      share: false,
      loading: true,
      anonymous: true,
    };

    if (message.chatType === CHAT_TYPES.CHANNEL) {
      songItemOptions.anonymous = true;
      songItemOptions.loading = false;
      songItemOptions.share = false;
      songItemOptions.control = true;
    }

    response.tracks.forEach((track) => {
      const trackEntity = this.trackToTrackEntity(
        track,
        musicServiceConnection.service.type,
      );

      return items.push(
        this.messagesService.createSongSearchItem(
          message,
          { track: trackEntity },
          songItemOptions,
        ),
      );
    });

    items.push(this.messagesService.createDonateSearchItem(message));

    await this.sender.sendSearch(
      {
        id: message.id,
        items,
      },
      options,
    );
  }

  async createSongInlineMessage(
    telegramUser: TelegramUser,
    trackUrl: ParserMusicServiceURL,
  ) {
    const musicServiceConnection = await this.musicServices.connect(
      MUSIC_SERVICE_PROVIDERS_BY_NAME[trackUrl.type],
      {
        userId: telegramUser.id,
        provider: this.type,
      },
    );
    const trackResponse = await musicServiceConnection.using((service) =>
      service.getTrack({
        id: trackUrl.data.id,
      }),
    );
    const track = this.trackToTrackEntity(
      trackResponse,
      musicServiceConnection.service.type,
    );
    const message: Message = new DumbMessage();

    message.id = 'SHARE_MESSAGE';
    message.from = {
      firstName: '',
      id: telegramUser.tg_id,
    };

    const data = this.messagesService.createSongSearchItem(
      message,
      { track },
      {
        anonymous: true,
        loading: false,
        share: false,
        control: false,
        donate: true,
      },
    );

    return this.sender.savePreparedInlineMessage(message.from.id, data);
  }

  private async onEmptySearch(message: Message) {
    const musicServiceContext = await this.generateMusicServiceContext(message);
    const musicService =
      await this.musicServices.connectToInternal(musicServiceContext);
    const tracks = await musicService.getCurrentTrack();

    const songItemOptions: ShareSongConfig = {
      loading: true,
      anonymous: true,
    };

    if (message.chatType === CHAT_TYPES.CHANNEL) {
      songItemOptions.anonymous = true;
      songItemOptions.loading = false;
      songItemOptions.share = false;
      songItemOptions.control = true;
    }

    const tracksSearchItems = tracks.map((trackResponse) => {
      const track = this.trackToTrackEntity(
        trackResponse.response,
        trackResponse.type,
      );
      return this.messagesService.createShareSearchItem(
        message,
        { track },
        songItemOptions,
      );
    });

    await this.sender.sendSearch({
      id: message.id,
      items: [
        ...tracksSearchItems,
        this.messagesService.createDonateSearchItem(message),
      ],
    });
  }

  private async onShareActionMessage(message: Message) {
    const musicServiceUriRegexp = new RegExp(
      `${ACTIONS.NOW_PLAYING}(?<musicServiceUri>.*)$`,
    );
    const match = message.text?.match(musicServiceUriRegexp);

    const songItemOptions: ShareSongConfig = {
      loading: false,
      control: true,
      anonymous: true,
      share: false,
      donate: false,
    };

    if (message.chatType === CHAT_TYPES.CHANNEL) {
      songItemOptions.anonymous = true;
      songItemOptions.loading = false;
      songItemOptions.share = true;
      songItemOptions.control = false;
    }

    await this.updateSongActionMessage(
      message,
      { uri: match.groups.musicServiceUri },
      songItemOptions,
    );
  }

  private async onSearchActionMessage(message: Message) {
    const musicServiceUriRegexp = new RegExp(
      `${ACTIONS.SPOTIFY_SEARCH}(?<musicServiceUri>.*)$`,
    );
    const match = message.text?.match(musicServiceUriRegexp);

    const songItemOptions: ShareSongConfig = {
      control: true,
      share: true,
      loading: false,
      anonymous: true,
    };

    if (message.chatType === CHAT_TYPES.CHANNEL) {
      songItemOptions.anonymous = true;
      songItemOptions.loading = false;
      songItemOptions.share = true;
      songItemOptions.control = false;
    }

    await this.updateSongActionMessage(
      message,
      { uri: match.groups.musicServiceUri },
      songItemOptions,
    );
  }

  private async updateSongActionMessage(
    message: Message,
    { uri }: { uri: string },
    _config?: ShareSongConfig,
  ) {
    const config = normalizeBotMethodOptions(_config);
    const parsedUri = MusicServicesUriParserService.parseUri(uri).uri;
    const musicServiceContext = await this.generateMusicServiceContext(message);
    const musicServiceConnection = await this.musicServices.connect(
      parsedUri.type,
      musicServiceContext,
    );
    const trackResponse = await musicServiceConnection.using((service) =>
      service.getTrack({
        id: parsedUri.uri.id,
      }),
    );
    const track = this.trackToTrackEntity(
      trackResponse,
      musicServiceConnection.service.type,
    );

    await this.updateShareSong(message, message, { track }, config, {
      type: musicServiceConnection.service.type,
    });
  }

  checkAppMode(message: Message) {
    const mode = this.appConfig.get<string>('APP_MODE');

    if (mode === 'maintenance') {
      throw new MaintenanceError();
    }
  }

  protected abstract generateMusicServiceContext(
    message: Pick<Message, 'from'>,
  ): Promise<MusicServicesConnectContext>;
}
