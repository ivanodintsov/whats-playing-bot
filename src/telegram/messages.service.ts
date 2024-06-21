import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Message } from 'src/bot-core/message/message';
import { AbstractMessagesService } from 'src/bot-core/messages.service';
import { TSenderMessageContent } from 'src/bot-core/sender.service';
import { ShareSongConfig, ShareSongData } from 'src/bot-core/types';
import { LinksService } from 'src/songs-info/links/links.service';
import { SongsInfoService } from 'src/songs-info/songs-info.service';
import escape from 'markdown-escape';

@Injectable()
export class MessagesService extends AbstractMessagesService {
  constructor(
    protected readonly appConfig: ConfigService,
    protected readonly linksService: LinksService,
    protected readonly songsInfoService: SongsInfoService,
  ) {
    super();
  }

  createCurrentPlayingMentionedTextMessage(
    message: Message,
    data: ShareSongData,
    config: ShareSongConfig,
  ): TSenderMessageContent {
    const username = message.from.firstName && escape(message.from.firstName);

    if (!username) {
      return {
        text: `*${data.track.name} - ${data.track.artists}*

[more links on sharemusic.cc]${this.songsInfoService.createSongUrl(data.track)})
`,
        parseMode: 'Markdown',
      };
    }

    if (config.anonymous) {
      return {
        text: `${username} is listening now: *${data.track.name} - ${
          data.track.artists
        }*

[more links on sharemusic.cc]${this.songsInfoService.createSongUrl(data.track)})
`,
        parseMode: 'Markdown',
      };
    }

    return {
      text: `[${username}](tg://user?id=${
        message.from.id
      }) is listening now: *${data.track.name} - ${data.track.artists}*

[more links on sharemusic.cc]${this.songsInfoService.createSongUrl(data.track)})
`,
      parseMode: 'Markdown',
    };
  }

  createSpotifyProfileMessage(
    message: Message,
    spotifyProfile: any,
  ): TSenderMessageContent {
    const username = spotifyProfile.display_name || message.from.firstName;

    return {
      text: `[${username && escape(username)} Spotify Profile](${
        spotifyProfile?.external_urls?.spotify
      })`,
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
