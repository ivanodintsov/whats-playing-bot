import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Message } from './message/message';
import { TButtonLink, TSenderMessageContent } from './sender.service';

@Injectable()
export class MessagesService {
  constructor(private readonly appConfig: ConfigService) {}

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
}
