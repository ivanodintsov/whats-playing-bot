import { SpotifyService } from 'src/spotify/spotify.service';
import { PrivateOnlyError, UserExistsError } from './errors';
import { Message } from './message/message';
import { Sender } from './sender.service';

export abstract class AbstractBotService {
  protected abstract readonly spotifyService: SpotifyService;
  protected abstract readonly sender: Sender;

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
}
