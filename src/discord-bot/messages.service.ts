import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Message } from 'src/bot-core/message/message';
import { AbstractMessagesService } from 'src/bot-core/messages.service';
import { TSenderMessageContent } from 'src/bot-core/sender.service';
import { ShareSongConfig, ShareSongData } from 'src/bot-core/types';

@Injectable()
export class DiscordMessagesService extends AbstractMessagesService {
  constructor(protected readonly appConfig: ConfigService) {
    super();
  }

  createCurrentPlayingMentionedTextMessage(
    message: Message,
    data: ShareSongData,
    config: ShareSongConfig,
  ): TSenderMessageContent & { data: ShareSongData } {
    const username = message.from.firstName;

    if (config.anonymous) {
      return {
        text: `${username} is listening now: **${data.track.name} - ${data.track.artists}**`,
        parseMode: 'Markdown',
        data,
      };
    }

    return {
      text: `<@${message.from.id}> is listening now: **${data.track.name} - ${data.track.artists}**`,
      parseMode: 'Markdown',
      data,
    };
  }

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
}
