import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Message } from 'src/bot-core/message/message';
import { AbstractMessagesService } from 'src/bot-core/messages.service';
import {
  TButtonLink,
  TSenderMessageContent,
} from 'src/bot-core/sender.service';
import { ShareSongConfig, ShareSongData } from 'src/bot-core/types';
import { MusicServicesService } from 'src/music-services/music-services.service';

@Injectable()
export class MessagesService extends AbstractMessagesService {
  constructor(
    protected readonly appConfig: ConfigService,
    protected readonly musicServices: MusicServicesService,
  ) {
    super();
  }

  createCurrentPlayingMentionedTextMessage(
    message: Message,
    data: ShareSongData,
    config: ShareSongConfig,
  ): TSenderMessageContent {
    const username = message.from.firstName;

    if (config.anonymous) {
      return {
        text: `${username} is listening now: *${data.track.name} - ${data.track.artists}*`,
        parseMode: 'Markdown',
      };
    }

    return {
      text: `[${username}](tg://user?id=${message.from.id}) is listening now: *${data.track.name} - ${data.track.artists}*`,
      parseMode: 'Markdown',
    };
  }

  // getSpotifySignUpButton(message: Message, token: string): TButtonLink[] {
  //   const site = this.appConfig.get<string>('SITE');

  //   return [
  //     {
  //       text: 'Sign up with Spotify',
  //       url: `${site}/telegram/bot?t=${token}`,
  //     },
  //     {
  //       text: 'Sign up with Deezer',
  //       url: `${site}/deezer/login/request/telegram?t=${token}`,
  //     },
  //   ];
  // }

  createSpotifyProfileMessage(
    message: Message,
    spotifyProfile: any,
  ): TSenderMessageContent {
    const username = spotifyProfile.display_name || message.from.firstName;

    return {
      text: `[${username} Spotify Profile](${spotifyProfile?.external_urls?.spotify})`,
      parseMode: 'Markdown',
    };
  }

  noConnectedMusicServiceMessage(message: Message): TSenderMessageContent {
    const url = `https://t.me/${this.appConfig.get<string>(
      'TELEGRAM_BOT_NAME',
    )}`;

    return {
      text: `You should connect Spotify account in a [private messages](${url}) with /start command`,
      parseMode: 'Markdown',
    };
  }

  expiredMusicServiceMessage(message: Message): TSenderMessageContent {
    const url = `https://t.me/${this.appConfig.get<string>(
      'TELEGRAM_BOT_NAME',
    )}`;

    return {
      text: `You should reconnect Spotify account in a [private messages](${url}) with /start command`,
      parseMode: 'Markdown',
    };
  }

  getSignUpActionAnswerMessage(message: Message): TSenderMessageContent {
    return {
      text: 'You should connect Spotify account in a private messages',
      buttons: [
        [
          {
            text: 'Connect Spotify',
            url: `t.me/${this.appConfig.get<string>(
              'TELEGRAM_BOT_NAME',
            )}?start=sign_up_pm`,
          },
        ],
      ],
    };
  }

  privateOnlyMessage(message: Message): TSenderMessageContent {
    const url = `https://t.me/${this.appConfig.get<string>(
      'TELEGRAM_BOT_NAME',
    )}`;

    return {
      text: `The command for [private messages](${url}) only`,
      parseMode: 'Markdown',
    };
  }
}
