import { LoggerService } from '@nestjs/common';
import { Queue } from 'bull';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import { PlaylistService } from 'src/playlist/playlist.service';
import {
  SearchJobData,
  ShareQueueJobData,
  ShareSongJobData,
  UpdateShareJobData,
} from 'src/bot-core/bot.processor';
import { ActionErrorsHandler } from './action.error-handler';
import { ACTIONS } from './constants';
import { PrivateOnlyError, UserExistsError } from './errors';
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
import { User } from 'src/music-services/music-service-core/music-service-core.service';
import { MusicServicesService } from 'src/music-services/music-services.service';

type ShareConfig = {
  control?: boolean;
  loading?: boolean;
};

export abstract class AbstractBotService {
  protected abstract readonly musicServices: MusicServicesService;
  protected abstract readonly sender: Sender;
  protected abstract readonly queue: Queue<ShareQueueJobData>;
  protected abstract readonly logger: LoggerService;
  protected abstract readonly songWhip: SongWhipService;
  protected abstract readonly messagesService: AbstractMessagesService;
  protected abstract spotifyPlaylist: PlaylistService;

  protected abstract createUser(message: Message): Promise<any>;
  protected abstract unlinkUserService(message: Message): Promise<any>;

  protected abstract generateMusicServiceUser(message: Message): User;

  public abstract sendSongToChats(
    message: Message,
    data: ShareSongData,
  ): Promise<any>;

  @MessageErrorsHandler()
  async singUp(message: Message) {
    const { chat } = message;

    if (chat.type !== CHAT_TYPES.PRIVATE) {
      throw new PrivateOnlyError();
    }

    try {
      await this.createUser(message);
      const messageContent = this.messagesService.getSignUpMessage(message);

      await this.sender.sendMessage(
        {
          chatId: chat.id,
          text: messageContent.text,
          buttons: this.messagesService.getSpotifySignUpButton(message),
        },
        message,
      );
    } catch (error) {
      if (error instanceof UserExistsError) {
        const messageContent = this.messagesService.getSpotifyAlreadyConnectedMessage(
          message,
        );

        await this.sender.sendMessage(
          {
            chatId: chat.id,
            ...messageContent,
          },
          message,
        );
      } else {
        throw error;
      }
    }
  }

  async shareSong(message: Message, config: ShareConfig = {}) {
    const jobData: ShareSongJobData = {
      message,
      config,
    };

    await this.queue.add('shareSong', jobData, {
      attempts: 5,
      removeOnComplete: true,
    });
  }

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
    const jobData: UpdateShareJobData = {
      message,
      messageToUpdate,
      data,
      config,
    };

    await this.queue.add('updateShare', jobData, {
      attempts: 5,
      removeOnComplete: true,
    });
  }

  @MessageErrorsHandler()
  async processShare(message: Message, config: ShareConfig = {}) {
    const trackData = await this.musicServices.getCurrentTrack({
      user: this.generateMusicServiceUser(message),
    });
    const { data } = trackData;

    this.setMusicType(message, trackData);

    const messageData = this.messagesService.createCurrentPlaying(
      message,
      { track: data },
      config,
    );

    const messageResponse = await this.sender.sendShare(
      {
        chatId: message.chat.id,
        ...messageData,
      },
      message,
    );

    await this.updateShareSong(
      message,
      messageResponse,
      { track: data },
      config,
    );
  }

  async processUpdateShare(
    message: Message,
    messageToUpdate: Message,
    data: ShareSongData,
    config: ShareConfig = {},
  ) {
    try {
      const { track } = data;
      const songWhip = await this.songWhip.getSong({
        url: track.url,
        country: 'us',
      });

      const messageData = this.messagesService.createCurrentPlaying(
        message,
        {
          ...data,
          songWhip,
        },
        {
          ...config,
          loading: false,
        },
      );

      await this.sender.updateShare(messageData, messageToUpdate);

      if (message.chat?.id) {
        await this.addToPlaylist(message, data);
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async addToPlaylist(
    message: Message,
    { track, songWhip }: ShareSongData,
  ) {
    try {
      // TODO: Change mongo schema. CHange chat_id prop to string
      if (typeof message.chat.id === 'number') {
        const newSong = await this.spotifyPlaylist.addSong({
          tg_user_id: message.from.id as number,
          chat_id: message.chat.id,
          name: track.name,
          artists: track.artists,
          url: track.url,
          uri: `${track.id}`,
          spotifyImage: track.thumb_url,
          image: songWhip.image,
        });

        return newSong;
      }
    } catch (error) {}
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
  async playSong(message: Message) {
    const regexp = new RegExp(`${ACTIONS.PLAY_ON_SPOTIFY}(?<spotifyId>.*)$`);
    const match = message.text?.match(regexp);
    const uri = match.groups.spotifyId;

    if (uri) {
      const musicServiceResponse = await this.musicServices.playSong({
        uri,
        user: this.generateMusicServiceUser(message),
      });

      this.setMusicType(message, musicServiceResponse);

      const messageData = this.messagesService.playSongMessage(message);

      await this.sender.answerToAction(
        {
          chatId: message.id,
          ...messageData,
        },
        message,
      );
    }
  }

  @ActionErrorsHandler()
  async addSongToQueue(message: Message) {
    const regexp = new RegExp(
      `${ACTIONS.ADD_TO_QUEUE_SPOTIFY}(?<spotifyId>.*)$`,
    );
    const match = message.text?.match(regexp);
    const uri = match.groups.spotifyId;

    if (uri) {
      const musicServiceResponse = await this.musicServices.addToQueue({
        uri,
        user: this.generateMusicServiceUser(message),
      });

      this.setMusicType(message, musicServiceResponse);

      const messageData = this.messagesService.addSongToQueueMessage(message);

      await this.sender.answerToAction(
        {
          chatId: message.id,
          ...messageData,
        },
        message,
      );
    }
  }

  @MessageErrorsHandler()
  async previousSong(message: Message) {
    await this._previousSong(message);
  }

  @ActionErrorsHandler()
  async previousSongAction(message: Message) {
    await this._previousSong(message);

    const messageData = this.messagesService.previousSongMessage(message);

    await this.sender.answerToAction(
      {
        chatId: message.id,
        ...messageData,
      },
      message,
    );
  }

  @MessageErrorsHandler()
  async nextSong(message: Message) {
    await this._nextSong(message);
  }

  @ActionErrorsHandler()
  async nextSongAction(message: Message) {
    await this._nextSong(message);

    const messageData = this.messagesService.nextSongMessage(message);

    await this.sender.answerToAction(
      {
        chatId: message.id,
        ...messageData,
      },
      message,
    );
  }

  async togglePlay(message: Message) {
    const musicServiceResponse = await this.musicServices.togglePlay({
      user: this.generateMusicServiceUser(message),
    });

    this.setMusicType(message, musicServiceResponse);
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
  async toggleFavorite(message: Message) {
    const regexp = new RegExp(
      `${ACTIONS.ADD_TO_FAVORITE}(?<service>.*):(?<type>.*):(?<spotifyId>.*)$`,
    );
    const match = message.text?.match(regexp);
    const uri = match.groups.spotifyId;

    if (uri) {
      const musicServiceResponse = await this.musicServices.toggleFavorite({
        trackIds: [uri],
        user: this.generateMusicServiceUser(message),
      });

      this.setMusicType(message, musicServiceResponse);

      if (musicServiceResponse.action === 'saved') {
        const messageData = this.messagesService.addedToFavoriteMessage(
          message,
        );

        await this.sender.answerToAction(
          {
            chatId: message.id,
            ...messageData,
          },
          message,
        );
      } else if (musicServiceResponse.action === 'removed') {
        const messageData = this.messagesService.removedFromFavoriteMessage(
          message,
        );

        await this.sender.answerToAction(
          {
            chatId: message.id,
            ...messageData,
          },
          message,
        );
      }
    }
  }

  @MessageErrorsHandler()
  async getProfile(message: Message) {
    const musicServiceResponse = await this.musicServices.getProfile({
      user: this.generateMusicServiceUser(message),
    });

    this.setMusicType(message, musicServiceResponse);

    const messageData = this.messagesService.createSpotifyProfileMessage(
      message,
      musicServiceResponse.data,
    );

    await this.sender.sendMessage(
      {
        chatId: message.chat.id,
        ...messageData,
      },
      message,
    );
  }

  @MessageErrorsHandler()
  async donate(message: Message) {
    const messageData = this.messagesService.createDonateMessage(message);

    await this.sender.sendMessage(
      {
        chatId: message.chat.id,
        ...messageData,
      },
      message,
    );
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
  async unlinkService(message: Message) {
    if (message.chat.type !== CHAT_TYPES.PRIVATE) {
      throw new PrivateOnlyError();
    }

    await this.unlinkUserService(message);

    const messageData = this.messagesService.unlinkService(message);

    await this.sender.sendUnlinkService(
      {
        chatId: message.chat.id,
        ...messageData,
      },
      message,
    );
  }

  @MessageErrorsHandler()
  async history(message: Message) {
    const messageData = this.messagesService.historyMessage(message);

    await this.sender.sendMessage(
      {
        chatId: message.chat.id,
        ...messageData,
      },
      message,
    );
  }

  protected async sendSongToChat(
    chatId: number | string,
    message: Message,
    { track }: ShareSongData,
  ) {
    try {
      const songWhip = await this.songWhip.getSong({
        url: track.url,
        country: 'us',
      });

      const messageData = this.messagesService.createCurrentPlaying(
        message,
        { track, songWhip },
        {
          anonymous: true,
          control: false,
          donate: false,
        },
      );

      await this.sender.sendShare(
        {
          chatId,
          ...messageData,
        },
        message,
      );
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async _previousSong(message: Message) {
    const musicServiceResponse = await this.musicServices.previousTrack({
      user: this.generateMusicServiceUser(message),
    });

    this.setMusicType(message, musicServiceResponse);
  }

  private async _nextSong(message: Message) {
    const musicServiceResponse = await this.musicServices.nextTrack({
      user: this.generateMusicServiceUser(message),
    });

    this.setMusicType(message, musicServiceResponse);
  }

  private async onSearch(message: Message) {
    const limit = 20;
    const offset = message.offset ? parseInt(`${message.offset}`, 10) : 0;
    const musicServiceResponse = await this.musicServices.searchTracks({
      user: this.generateMusicServiceUser(message),
      search: message.text,
      options: {
        pagination: {
          offset,
          limit,
        },
      },
    });

    this.setMusicType(message, musicServiceResponse);

    const items: TSenderSearchItem[] = [];

    const options: TSenderSearchOptions = {
      nextOffset: musicServiceResponse.pagination.next
        ? `${offset + limit}`
        : null,
    };

    musicServiceResponse.data.forEach(track =>
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

    this.sender.sendSearch(
      {
        id: message.id,
        items,
      },
      message,
      options,
    );
  }

  private async onEmptySearch(message: Message) {
    const musicServiceResponse = await this.musicServices.getCurrentTrack({
      user: this.generateMusicServiceUser(message),
    });

    this.setMusicType(message, musicServiceResponse);

    const items = [
      this.messagesService.createShareSearchItem(
        message,
        { track: musicServiceResponse.data },
        {},
      ),
    ];

    await this.sender.sendSearch(
      {
        id: message.id,
        items: [...items, this.messagesService.createDonateSearchItem(message)],
      },
      message,
    );
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
    const musicServiceResponse = await this.musicServices.getTrack({
      id,
      user: this.generateMusicServiceUser(message),
    });

    this.setMusicType(message, musicServiceResponse);

    await this.updateShareSong(message, message, {
      track: musicServiceResponse.data,
    });
  }

  private setMusicType(message: Message, data: { type: string }) {
    message.musicServiceType = data.type;

    return message;
  }
}
