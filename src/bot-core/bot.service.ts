import { LoggerService } from '@nestjs/common';
import { Queue } from 'bull';
import { SpotifyService } from 'src/spotify/spotify.service';
import {
  AddSongToQueueJobData,
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
import { CHAT_TYPES, Message } from './message/message';
import { AbstractMessagesService } from './messages.service';
import { SearchErrorHandler } from './search.error-handler';
import {
  Sender,
  TSenderSearchItem,
  TSenderSearchOptions,
} from './sender.service';
import { ShareSongData } from './types';
import { SongsInfoService } from 'src/songs-info/songs-info.service';
import { TrackStatisticsService } from 'src/songs-info/track-statistics/track-statistics.service';
import { TrackPlaylistService } from 'src/track-playlist/track-playlist.service';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';
import { ConfigService } from '@nestjs/config';
import { GA4Service } from 'src/utils/ga4/ga4.service';

type ShareConfig = {
  control?: boolean;
  loading?: boolean;
};

export abstract class AbstractBotService {
  protected abstract readonly spotifyService: SpotifyService;
  public abstract readonly sender: Sender;
  protected abstract readonly queue: Queue<ShareQueueJobData>;
  protected abstract readonly logger: LoggerService;
  protected abstract readonly songsInfoService: SongsInfoService;
  protected abstract readonly messagesService: AbstractMessagesService;
  protected abstract readonly trackStatisticService: TrackStatisticsService;
  protected abstract readonly trackPlaylistService: TrackPlaylistService;
  protected abstract readonly appConfig: ConfigService;
  protected abstract readonly gaService: GA4Service;

  protected abstract createUser(message: Message): Promise<{ token: string }>;
  protected abstract getUser(
    message: Pick<Message, 'from'>,
  ): Promise<TelegramUser>;

  public abstract sendSongToChats(
    message: Message,
    data: ShareSongData,
  ): Promise<any>;

  @MessageErrorsHandler()
  async signUpProcess(message: Message) {
    const { chat } = message;

    if (chat.type !== CHAT_TYPES.PRIVATE) {
      throw new PrivateOnlyError();
    }

    try {
      await this.gaService.send(
        [
          {
            name: 'sign-up-bot',
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
      this.logger.error(error.message, error.stack, 'ga4');
    }

    try {
      const user = await this.createUser(message);
      const messageContent = this.messagesService.getSignUpMessage(message);

      await this.sender.sendMessage({
        chatId: chat.id,
        text: messageContent.text,
        buttons: [
          [this.messagesService.getSpotifySignUpButton(message, user.token)],
        ],
      });
    } catch (error) {
      this.logger.error(error.message, error.stack, error, message);

      if (error instanceof UserExistsError) {
        const messageContent = this.messagesService.getSpotifyAlreadyConnectedMessage(
          message,
        );

        await this.sender.sendMessage({
          chatId: chat.id,
          ...messageContent,
        });
      } else {
        throw error;
      }
    }
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
  async shareSong(message: Message, config: ShareConfig = {}) {
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
      loading: true,
    });
  }

  async updateShareSong(
    message: Message,
    messageToUpdate: Message,
    data: ShareSongData,
    config: ShareConfig = {},
  ) {
    try {
      const jobData: UpdateShareJobData = {
        message,
        messageToUpdate,
        data,
        config,
      };

      await this.queue.add('updateShare', jobData, {
        attempts: 5,
        removeOnComplete: true,
        priority: 1,
      });
    } catch (error) {
      this.logger.error(
        error.message,
        error.stack,
        'this.sender.updateShareSong',
      );
    }
  }

  @MessageErrorsHandler()
  async processShare(message: Message, config: ShareConfig = {}) {
    const { from } = message;
    const user = await this.getUser(message);
    const { track } = await this.spotifyService.getCurrentTrack({
      user: {
        provider: message.providerUnique,
        userId: user.id,
      },
    });

    const messageData = this.messagesService.createCurrentPlaying(
      message,
      { track },
      config,
    );

    const messageResponse = await this.sender.sendShare({
      chatId: message.chat.id,
      ...messageData,
    });

    await this.updateShareSong(message, messageResponse, { track }, config);
  }

  async processUpdateShare(
    message: Message,
    messageToUpdate: Message,
    data: ShareSongData,
    config: ShareConfig = {},
  ) {
    try {
      const { track } = data;
      const trackInfo = await this.songsInfoService.getSong({
        url: track.url,
      });

      const messageData = this.messagesService.createCurrentPlaying(
        message,
        {
          ...data,
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
        this.logger.error(
          error.message,
          error.stack,
          'this.sender.updateShare',
        );
      }

      await this.trackStatisticService.shareInc(trackInfo.id);
      await this.addToPlaylist(message, {
        track,
        trackInfo,
      });
    } catch (error) {
      this.logger.error(error.message, error.stack);
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
      this.logger.error(error.message, error.stack);
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
    const regexp = new RegExp(`${ACTIONS.PLAY_ON_SPOTIFY}(?<spotifyId>.*)$`);
    const match = message.text?.match(regexp);
    const uri = match.groups.spotifyId;

    if (uri) {
      const user = await this.getUser(message);
      await this.spotifyService.playSong({
        uri,
        user: {
          provider: message.providerUnique,
          userId: user.id,
        },
      });

      const messageData = this.messagesService.playSongMessage(message);

      await this.sender.answerToAction({
        chatId: message.id,
        ...messageData,
      });
    }
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
      `${ACTIONS.ADD_TO_QUEUE_SPOTIFY}(?<spotifyId>.*)$`,
    );
    const match = message.text?.match(regexp);
    const uri = match.groups.spotifyId;

    if (uri) {
      const user = await this.getUser(message);
      await this.spotifyService.addToQueue({
        uri,
        user: {
          provider: message.providerUnique,
          userId: user.id,
        },
      });

      const messageData = this.messagesService.addSongToQueueMessage(message);

      await this.sender.answerToAction({
        chatId: message.id,
        ...messageData,
      });
    }
  }

  @MessageErrorsHandler()
  async previousSongProcess(message: Message) {
    await this._previousSong(message);
  }

  @MessageErrorsHandler()
  async previousSong(message: Message) {
    const jobData: PreviousSongJobData = {
      message,
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
  async nextSongProcess(message: Message) {
    await this._nextSong(message);
  }

  @MessageErrorsHandler()
  async nextSong(message: Message) {
    const jobData: NextSongJobData = {
      message,
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
  async togglePlayProcess(message: Message) {
    const user = await this.getUser(message);
    await this.spotifyService.togglePlay({
      provider: message.providerUnique,
      userId: user.id,
    });
  }

  @MessageErrorsHandler()
  async togglePlay(message: Message) {
    const jobData: TogglePlayJobData = {
      message,
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
      `${ACTIONS.ADD_TO_FAVORITE}(?<service>.*):(?<type>.*):(?<spotifyId>.*)$`,
    );
    const match = message.text?.match(regexp);
    const uri = match.groups.spotifyId;

    if (uri) {
      const user = await this.getUser(message);
      const response = await this.spotifyService.toggleFavorite({
        trackIds: [uri],
        user: {
          provider: message.providerUnique,
          userId: user.id,
        },
      });

      if (response.action === 'saved') {
        const messageData = this.messagesService.addedToFavoriteMessage(
          message,
        );

        await this.sender.answerToAction({
          chatId: message.id,
          ...messageData,
        });
      } else if (response.action === 'removed') {
        const messageData = this.messagesService.removedFromFavoriteMessage(
          message,
        );

        await this.sender.answerToAction({
          chatId: message.id,
          ...messageData,
        });
      }
    }
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
    const user = await this.getUser(message);
    const { body } = await this.spotifyService.getProfile({
      provider: message.providerUnique,
      userId: user.id,
    });

    const messageData = this.messagesService.createSpotifyProfileMessage(
      message,
      body,
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
    if (message.chat.type !== CHAT_TYPES.PRIVATE) {
      throw new PrivateOnlyError();
    }

    const user = await this.getUser(message);
    await this.spotifyService.removeByTgId({
      provider: message.providerUnique,
      userId: user.id,
    });

    const messageData = this.messagesService.unlinkService(message);

    await this.sender.sendUnlinkService({
      chatId: message.chat.id,
      ...messageData,
    });
  }

  @MessageErrorsHandler()
  async unlinkService(message: Message) {
    const jobData: UnlinkServiceJobData = {
      message,
    };

    await this.queue.add('unlinkService', jobData, {
      attempts: 5,
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
  ) {
    try {
      const trackInfo = await this.songsInfoService.getSong({
        url: track.url,
      });

      const messageData = this.messagesService.createCurrentPlaying(
        message,
        { track, trackInfo },
        {
          anonymous: true,
          control: false,
          donate: false,
        },
      );

      await this.sender.sendShare({
        chatId,
        ...messageData,
      });
    } catch (error) {
      this.logger.error(error.message, error.stack);
    }
  }

  private async _previousSong(message: Message) {
    const user = await this.getUser(message);
    await this.spotifyService.previousTrack({
      provider: message.providerUnique,
      userId: user.id,
    });
  }

  private async _nextSong(message: Message) {
    const user = await this.getUser(message);
    await this.spotifyService.nextTrack({
      provider: message.providerUnique,
      userId: user.id,
    });
  }

  private async onSearch(message: Message) {
    const limit = 20;
    const offset = message.offset ? parseInt(`${message.offset}`, 10) : 0;
    const user = await this.getUser(message);
    const response = await this.spotifyService.searchTracks({
      user: {
        provider: message.providerUnique,
        userId: user.id,
      },
      search: message.text,
      options: {
        pagination: {
          offset,
          limit,
        },
      },
    });

    const items: TSenderSearchItem[] = [];

    const options: TSenderSearchOptions = {
      nextOffset: response.pagination.next ? `${offset + limit}` : null,
    };

    response.tracks.forEach(track =>
      items.push(
        this.messagesService.createSongSearchItem(
          message,
          { track },
          {
            control: true,
            loading: true,
          },
        ),
      ),
    );

    items.push(this.messagesService.createDonateSearchItem(message));

    await this.sender.sendSearch(
      {
        id: message.id,
        items,
      },
      options,
    );
  }

  private async onEmptySearch(message: Message) {
    const user = await this.getUser(message);
    const { track } = await this.spotifyService.getCurrentTrack({
      user: {
        provider: message.providerUnique,
        userId: user.id,
      },
    });

    await this.sender.sendSearch({
      id: message.id,
      items: [
        this.messagesService.createShareSearchItem(message, { track }, {}),
        this.messagesService.createDonateSearchItem(message),
      ],
    });
  }

  private async onShareActionMessage(message: Message) {
    const regexp = new RegExp(
      `${ACTIONS.NOW_PLAYING}spotify:track:(?<spotifyId>.*)$`,
    );
    const match = message.text?.match(regexp);

    await this.updateSongActionMessage(message, { id: match.groups.spotifyId });
  }

  private async onSearchActionMessage(message: Message) {
    const regexp = new RegExp(
      `${ACTIONS.SPOTIFY_SEARCH}spotify:track:(?<spotifyId>.*)$`,
    );
    const match = message.text?.match(regexp);

    await this.updateSongActionMessage(message, { id: match.groups.spotifyId });
  }

  private async updateSongActionMessage(
    message: Message,
    { id }: { id: string },
  ) {
    const user = await this.getUser(message);
    const { track } = await this.spotifyService.getTrack({
      id,
      user: {
        provider: message.providerUnique,
        userId: user.id,
      },
    });

    await this.updateShareSong(message, message, { track });
  }

  private checkAppMode(message: Message) {
    const mode = this.appConfig.get<string>('APP_MODE');

    if (mode === 'maintenance') {
      throw new MaintenanceError();
    }
  }
}
