import { LoggerService } from '@nestjs/common';
import { Queue } from 'bull';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import { SpotifyService } from 'src/spotify/spotify.service';
import {
  SearchJobData,
  ShareQueueJobData,
  ShareSongJobData,
  UpdateShareJobData,
} from '../telegram.processor';
import { ACTIONS } from './constants';
import { PrivateOnlyError, UserExistsError } from './errors';
import { CHAT_TYPES, Message } from './message/message';
import { AbstractMessagesService } from './messages.service';
import {
  Sender,
  TSenderSearchItem,
  TSenderSearchOptions,
} from './sender.service';
import { ShareSongData } from './types';

type ShareConfig = {
  control?: boolean;
  loading?: boolean;
};

export abstract class AbstractBotService {
  abstract onPrivateOnly(message: Message): Promise<any>;

  protected abstract readonly spotifyService: SpotifyService;
  protected abstract readonly sender: Sender;
  protected abstract readonly queue: Queue<ShareQueueJobData>;
  protected abstract readonly logger: LoggerService;
  protected abstract readonly songWhip: SongWhipService;
  protected abstract readonly messagesService: AbstractMessagesService;

  protected abstract createUser(message: Message): Promise<{ token: string }>;

  async singUp(message: Message) {
    const { chat } = message;

    if (chat.type !== CHAT_TYPES.PRIVATE) {
      throw new PrivateOnlyError();
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

  async processShare(message: Message, config: ShareConfig = {}) {
    const { from } = message;
    const { track } = await this.spotifyService.getCurrentTrack({
      user: {
        tg_id: from.id,
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

      // if (chatId) {
      //   this.addToPlaylist(message as Message, song, songWhip);
      // }
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

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

  async playSong(message: Message) {
    const regexp = new RegExp(`${ACTIONS.PLAY_ON_SPOTIFY}(?<spotifyId>.*)$`);
    const match = message.text?.match(regexp);
    const uri = match.groups.spotifyId;

    if (uri) {
      await this.spotifyService.playSong({
        uri,
        user: {
          tg_id: message.from.id,
        },
      });

      const messageData = this.messagesService.playSongMessage(message);

      await this.sender.answerToAction({
        chatId: message.id,
        ...messageData,
      });
    }
  }

  async addSongToQueue(message: Message) {
    const regexp = new RegExp(
      `${ACTIONS.ADD_TO_QUEUE_SPOTIFY}(?<spotifyId>.*)$`,
    );
    const match = message.text?.match(regexp);
    const uri = match.groups.spotifyId;

    if (uri) {
      await this.spotifyService.addToQueue({
        uri,
        user: {
          tg_id: message.from.id,
        },
      });

      const messageData = this.messagesService.addSongToQueueMessage(message);

      await this.sender.answerToAction({
        chatId: message.id,
        ...messageData,
      });
    }
  }

  async previousSong(message: Message) {
    await this.spotifyService.previousTrack({
      tg_id: message.from.id,
    });

    const messageData = this.messagesService.previousSongMessage(message);

    await this.sender.answerToAction({
      chatId: message.id,
      ...messageData,
    });
  }

  async nextSong(message: Message) {
    await this.spotifyService.nextTrack({
      tg_id: message.from.id,
    });

    const messageData = this.messagesService.nextSongMessage(message);

    await this.sender.answerToAction({
      chatId: message.id,
      ...messageData,
    });
  }

  async processSearch(message: Message) {
    if (message.text) {
      await this.onSearch(message);
    } else {
      await this.onEmptySearch(message);
    }
  }

  async toggleFavorite(message: Message) {
    const regexp = new RegExp(
      `${ACTIONS.ADD_TO_FAVORITE}(?<service>.*):(?<type>.*):(?<spotifyId>.*)$`,
    );
    const match = message.text?.match(regexp);
    const uri = match.groups.spotifyId;

    if (uri) {
      const response = await this.spotifyService.toggleFavorite({
        trackIds: [uri],
        user: {
          tg_id: message.from.id,
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

  async getProfile(message: Message) {
    const { body } = await this.spotifyService.getProfile({
      tg_id: message.from.id,
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

  private async onSearch(message: Message) {
    try {
      const limit = 20;
      const offset = message.offset ? parseInt(`${message.offset}`, 10) : 0;
      const response = await this.spotifyService.searchTracks({
        user: { tg_id: message.from.id },
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

      items.push(this.messagesService.createDonateSearchItem());

      this.sender.sendSearch(
        {
          id: message.id,
          items,
        },
        options,
      );
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }

  private async onEmptySearch(message: Message) {
    try {
      const { track } = await this.spotifyService.getCurrentTrack({
        user: {
          tg_id: message.from.id,
        },
      });

      await this.sender.sendSearch({
        id: message.id,
        items: [
          this.messagesService.createShareSearchItem(message, { track }, {}),
          this.messagesService.createDonateSearchItem(),
        ],
      });
    } catch (error) {
      console.log(error);
      // throw {
      //   error,
      //   query,
      // };
    }
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
    const { track } = await this.spotifyService.getTrack({
      id,
      user: {
        tg_id: message.from.id,
      },
    });

    await this.updateShareSong(message, message, { track });
  }
}
