import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Message } from 'src/bot-core/message/message';
import { AbstractMessagesService } from 'src/bot-core/messages.service';
import { TSenderMessageContent } from 'src/bot-core/sender.service';
import { ShareSongConfig, ShareSongData } from 'src/bot-core/types';
import { LinksService } from 'src/songs-info/links/links.service';
import { SongsInfoService } from 'src/songs-info/songs-info.service';
import { escapers } from '@telegraf/entity';
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
    let songTitle = [data?.track?.name, data?.track?.artists].filter(title => !!title).join(' - ');
    songTitle = `${escapers.MarkdownV2(songTitle)}`;

    let username: string | undefined;
    let text = '';

    if (config.share) {
      text = `Listen to *${songTitle}*`;
    } else {
      try {
        username =
          message.from.firstName && escapers.MarkdownV2(message.from.firstName);
      } catch (error) {
        this.logger.error(error);
      }
  
      if (config.serviceChat && username) {
        text = `${username}${escapers.MarkdownV2(
          ' is listening now: ',
        )}*${songTitle}*`;
      } else if (config.anonymous) {
        text = `You are listening now: *${songTitle}*`;
      } else if (!username) {
        text = `*${songTitle}*`;
      } else {
        text = `[${username}](tg://user?id=${
          message.from.id
        })${escapers.MarkdownV2(' is listening now: ')}*${songTitle}*`;
      }
    }

    if (data.trackInfo) {
      text = `${text}
[${escapers.MarkdownV2(
        'more links on sharemusic.cc',
      )}](${this.songsInfoService.createSongUrl(data.trackInfo)})`;
    }

    return {
      text,
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
