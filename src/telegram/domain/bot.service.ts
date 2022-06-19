import { Queue } from 'bull';
import { SpotifyService } from 'src/spotify/spotify.service';
import { PrivateOnlyError, UserExistsError } from './errors';
import { Message } from './message/message';
import { Sender } from './sender.service';

type ShareConfig = {
  control?: boolean;
  loading?: boolean;
};

export abstract class AbstractBotService {
  protected abstract readonly spotifyService: SpotifyService;
  protected abstract readonly sender: Sender;
  protected abstract readonly queue: Queue;

  protected abstract createUser(message: Message): Promise<{ token: string }>;

  async singUp(message: Message) {
    const { chat } = message;

    if (chat.type !== 'private') {
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

  async addShareToQueue(message: Message) {
    await this.queue.add(
      'shareSong',
      {
        message,
      },
      {
        attempts: 5,
        removeOnComplete: true,
      },
    );
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

    await this.queue.add(
      'updateShare',
      {
        from: message.from,
        message: messageResponse,
        track,
        config,
      },
      {
        attempts: 5,
        removeOnComplete: true,
      },
    );
  }
}
