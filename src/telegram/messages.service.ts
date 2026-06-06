import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Message } from 'src/bot-core/message/message';
import { AbstractMessagesService } from 'src/bot-core/messages.service';
import { TSenderMessageContent } from 'src/bot-core/sender.service';
import { ShareSongConfig, ShareSongData } from 'src/bot-core/types';
import { LinksService } from 'src/songs-info/links/links.service';
import { SongsInfoService } from 'src/songs-info/songs-info.service';
import { b, fmt, FormattedString, link } from '@grammyjs/parse-mode';
import { Logger } from 'src/logger';

@Injectable()
export class MessagesService extends AbstractMessagesService {
  private readonly logger = new Logger(MessagesService.name);

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
    let songTitle = [data?.track?.name, data?.track?.artists]
      .filter((title) => !!title)
      .join(' - ');
    songTitle = songTitle;

    let username: string | undefined;
    let text: FormattedString = new FormattedString('');

    if (config.share) {
      text = fmt`Listen to *${songTitle}*`;
    } else {
      try {
        username = message.from.firstName;
      } catch (error) {
        this.logger.error(error);
      }

      if (config.serviceChat && username) {
        text = fmt`${username} is listening now: ${b}${songTitle}${b}`;
      } else if (config.anonymous) {
        text = fmt`You are listening now: ${b}${songTitle}${b}`;
      } else if (!username) {
        text = fmt`${b}${songTitle}${b}`;
      } else {
        text = fmt`${link(
          `tg://user?id=${message.from.id}`,
        )}${username}${link} is listening now: ${b}${songTitle}${b}`;
      }
    }

    if (data.trackInfo) {
      text = fmt`${text} 
      ${link(this.songsInfoService.createSongUrl(data.trackInfo))}more links on sharemusic.cc${link}`;
    }

    return {
      text: text.text,
      parseMode: 'Markdown',
    };
  }

  createSpotifyProfileMessage(
    message: Message,
    spotifyProfile: any,
  ): TSenderMessageContent {
    const username = spotifyProfile.display_name || message.from.firstName;

    return {
      text: `[${username && escapers.MarkdownV2(username)} Spotify Profile](${
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
