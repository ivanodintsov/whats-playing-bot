import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Message } from './domain/message/message';
import { AbstractMessagesService } from './domain/messages.service';
import { TSenderMessageContent } from './domain/sender.service';
import { ShareSongConfig, ShareSongData } from './domain/types';

@Injectable()
export class MessagesService extends AbstractMessagesService {
  constructor(protected readonly appConfig: ConfigService) {
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
}
