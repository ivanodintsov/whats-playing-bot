import { LoggerService } from '@nestjs/common';
import { Queue } from 'bull';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import { SpotifyService } from 'src/spotify/spotify.service';
import {
  ShareQueueJobData,
  ShareSongJobData,
  UpdateShareJobData,
} from '../telegram.processor';
import { PrivateOnlyError, UserExistsError } from './errors';
import { CHAT_TYPES, Message } from './message/message';
import { Sender } from './sender.service';
import { ShareSongData } from './types';

type ShareConfig = {
  control?: boolean;
  loading?: boolean;
};

export abstract class AbstractBotService {
  protected abstract readonly spotifyService: SpotifyService;
  protected abstract readonly sender: Sender;
  protected abstract readonly queue: Queue<ShareQueueJobData>;
  protected abstract readonly logger: LoggerService;
  protected abstract readonly songWhip: SongWhipService;

  protected abstract createUser(message: Message): Promise<{ token: string }>;

  async singUp(message: Message) {
    const { chat } = message;

    if (chat.type !== CHAT_TYPES.PRIVATE) {
      throw new PrivateOnlyError();
    }

    try {
      const user = await this.createUser(message);
      await this.sender.sendSignUpMessage(message, user.token);
    } catch (error) {
      if (error instanceof UserExistsError) {
        await this.sender.sendUserExistsMessage(message);
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

    const messageResponse = await this.sender.sendShare(
      message,
      { track },
      config,
    );

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

      await this.sender.updateShare(
        message,
        messageToUpdate,
        {
          ...data,
          songWhip,
        },
        config,
      );

      // if (chatId) {
      //   this.addToPlaylist(message as Message, song, songWhip);
      // }
    } catch (error) {
      this.logger.error(error.message, error);
    }
  }
}
