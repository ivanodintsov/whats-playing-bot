import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Message } from 'src/bot-core/message/message';
import { AbstractMessagesService } from 'src/bot-core/messages.service';
import { ShareSongConfig, ShareSongData } from 'src/bot-core/types';
import { LinksService } from 'src/songs-info/links/links.service';
import { SongsInfoService } from 'src/songs-info/songs-info.service';
import { FormattedString } from '@grammyjs/parse-mode';
import { Logger } from 'src/logger';
import { TelegramSenderMessageContent } from './types';

@Injectable()
export class MessagesService extends AbstractMessagesService {
  private readonly logger = new Logger(MessagesService.name);

  // TODO create separate service
  protected PREMIUM_USERS: Record<string, boolean> = {};

  constructor(
    protected readonly appConfig: ConfigService,
    protected readonly linksService: LinksService,
    protected readonly songsInfoService: SongsInfoService,
  ) {
    super();

    // TODO create separate service
    const usersString = appConfig.get<string>('PREMIUM_USERS');

    if (usersString) {
      this.PREMIUM_USERS = usersString
        .split(',')
        .reduce((acc, item) => ({ ...acc, [item]: true }), {});
    }
  }

  createCurrentPlayingMentionedTextMessage(
    message: Message,
    data: ShareSongData,
    config: ShareSongConfig,
  ): TelegramSenderMessageContent {
    let songTitle = [data?.track?.name, data?.track?.artists]
      .filter((title) => !!title)
      .join(' - ');
    songTitle = songTitle;

    let username: string | undefined;
    let text: FormattedString = new FormattedString('');

    if (config.share) {
      text = text.plain('Listen to ').b(songTitle);
    } else {
      try {
        username = message.from.firstName;
      } catch (error) {
        this.logger.error(error);
      }

      if (config.serviceChat && username) {
        text = text.plain(`${username} is listening now: `).b(songTitle);
      } else if (config.anonymous) {
        text = text.plain('You are listening now: ').b(songTitle);
      } else if (!username) {
        text = text.b(songTitle);
      } else {
        text = text
          .link(username, `tg://user?id=${message.from.id}`)
          .plain(' is listening now: ')
          .b(songTitle);
      }
    }

    if (data.trackInfo) {
      text = text
        .plain('\n')
        .link(
          'more links on sharemusic.cc',
          this.songsInfoService.createSongUrl(data.trackInfo),
        );
    }

    return {
      text: text.text,
      entities: text.entities,
    };
  }

  createSpotifyProfileMessage(
    message: Message,
    spotifyProfile: any,
  ): TelegramSenderMessageContent {
    const username = spotifyProfile.display_name || message.from.firstName;

    const text = FormattedString.link(
      `${username ? `${username} ` : ''}Spotify Profile`,
      spotifyProfile?.external_urls?.spotify,
    );

    return {
      text: text.text,
      entities: text.entities,
    };
  }

  noConnectedMusicServiceMessage(
    message: Message,
  ): TelegramSenderMessageContent {
    const url = `https://t.me/${this.appConfig.get<string>(
      'TELEGRAM_BOT_NAME',
    )}`;

    return {
      text: `You should connect Spotify account in a [private messages](${url}) with /start command`,
      parseMode: 'Markdown',
    };
  }

  expiredMusicServiceMessage(message: Message): TelegramSenderMessageContent {
    const url = `https://t.me/${this.appConfig.get<string>(
      'TELEGRAM_BOT_NAME',
    )}`;

    return {
      text: `You should reconnect Spotify account in a [private messages](${url}) with /start command`,
      parseMode: 'Markdown',
    };
  }

  getSignUpActionAnswerMessage(message: Message): TelegramSenderMessageContent {
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

  privateOnlyMessage(message: Message): TelegramSenderMessageContent {
    const url = `https://t.me/${this.appConfig.get<string>(
      'TELEGRAM_BOT_NAME',
    )}`;

    return {
      text: `The command for [private messages](${url}) only`,
      parseMode: 'Markdown',
    };
  }
}
