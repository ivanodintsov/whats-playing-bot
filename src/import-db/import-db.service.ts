import { Injectable } from '@nestjs/common';
import { SongsInfoService } from 'src/songs-info/songs-info.service';
import { delay } from 'src/utils/delay';
import { Logger } from 'src/logger';
import { TrackPlaylistService } from 'src/track-playlist/track-playlist.service';
import { CLIENT_PROVIDES } from 'src/constants';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';
import { InjectModel } from '@nestjs/sequelize';
import { UsersService } from 'src/users/users.service';
import { CLIENT_UNIQUE_PROVIDES } from 'src/constants';
import { TrackStatisticsService } from 'src/songs-info/track-statistics/track-statistics.service';
import * as spotifyUri from 'spotify-uri';
import * as fs from 'fs/promises';
import { ConfigService } from '@nestjs/config';
import { SpotifyService } from 'src/music-services/spotify-service/spotify-service.service';

@Injectable()
export class ImportDbService {
  private readonly logger = new Logger(ImportDbService.name);

  constructor(
    private readonly songsIngoService: SongsInfoService,
    private readonly trackPlaylistService: TrackPlaylistService,

    @InjectModel(TelegramUser)
    private readonly telegramUserModel: typeof TelegramUser,

    private readonly usersService: UsersService,
    private readonly spotifyService: SpotifyService,
    private readonly trackStatistics: TrackStatisticsService,
    private readonly appConfig: ConfigService,
  ) {}

  async importTracks() {
    const file = await fs.readFile(
      `${this.appConfig.get<string>('DB_IMPORT_PATH')}/tracks-data.json`,
    );
    const tracksData = JSON.parse(file.toString()).sort((a, b) => {
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });

    for (let i = 1865 + 50; i < tracksData.length; i++) {
      const track = tracksData[i];
      try {
        if (!track.searchTrackUrl) {
          continue;
        }

        console.log(track.searchTrackUrl);

        await this.songsIngoService.getSong({
          url: track.searchTrackUrl,
          oldId: track._id,
        });
      } catch (error) {
        this.logger.error(error.message, error.stack);
      }
      // await delay(200);
    }
  }

  async importTelegramUsers() {
    const file = await fs.readFile(
      `${this.appConfig.get<string>('DB_IMPORT_PATH')}/telegram-users.json`,
    );
    const telegramUsers = JSON.parse(file.toString()).sort((a, b) => {
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    });

    for (let i = 0; i < telegramUsers.length; i++) {
      const telegramUser = telegramUsers[i];
      try {
        let user = await this.telegramUserModel.findOne({
          where: {
            tg_id: `${telegramUser.tg_id}`,
          },
        });

        if (!user) {
          const domainUser = await this.usersService.createEmptyUser();
          user = await this.telegramUserModel.create({
            userId: domainUser.id,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name,
            language_code: telegramUser.language_code,
            username: telegramUser.username,
            tg_id: `${telegramUser.tg_id}`,
            createdAt:
              telegramUser.createdAt && new Date(telegramUser.createdAt),
            updatedAt:
              telegramUser.updatedAt && new Date(telegramUser.updatedAt),
          });
        }
      } catch (error) {
        this.logger.error(error.message, error.stack);
      }
    }
  }

  async importPlaylist() {
    const file = await fs.readFile(
      `${this.appConfig.get<string>('DB_IMPORT_PATH')}/tracks-playlist.json`,
    );
    const trackPlaylist = JSON.parse(file.toString());

    for (let i = 0; i < trackPlaylist.length; i++) {
      const track = trackPlaylist[i];
      try {
        if (!track.url) {
          continue;
        }

        const trackInstance = await this.songsIngoService.getSong({
          url: track.url,
          oldId: track._id,
        });

        const user = await this.telegramUserModel.findOne({
          where: {
            tg_id: track.tg_user_id && `${track.tg_user_id}`,
          },
        });

        if (!user) {
          console.log('NO USER');
          continue;
        }

        await this.trackPlaylistService.addSong({
          trackId: trackInstance.id,
          chat_id: track.chat_id && `${track.chat_id}`,
          providerUserId: user.id,
          provider: CLIENT_PROVIDES.TELEGRAM,
          createdAt: track.createdAt && new Date(track.createdAt),
          updatedAt: track.updatedAt && new Date(track.updatedAt),
        });
      } catch (error) {
        this.logger.error(error.message, error.stack);
      }
    }
  }

  async importSpotifyTokens() {
    const file = await fs.readFile(
      `${this.appConfig.get<string>('DB_IMPORT_PATH')}/spotify-tokens.json`,
    );
    let spotifyTokens = JSON.parse(file.toString());

    const tokensExp = spotifyTokens
      .filter((tokens) => tokens.expires_date)
      .sort((a, b) => {
        return +new Date(b.createdAt) - +new Date(a.createdAt);
      });
    const tokensNoExp = spotifyTokens
      .filter((tokens) => !tokens.expires_date)
      .sort((a, b) => {
        return +new Date(b.createdAt) - +new Date(a.createdAt);
      });

    spotifyTokens = [...tokensExp, ...tokensNoExp];

    for (let i = 0; i < spotifyTokens.length; i++) {
      const tokens = spotifyTokens[i];
      try {
        const user = await this.telegramUserModel.findOne({
          where: {
            tg_id: `${tokens.tg_id}`,
          },
        });

        if (!user) {
          continue;
        }

        await this.spotifyService.createTokens({
          userId: user.id,
          provider: CLIENT_UNIQUE_PROVIDES.TELEGRAM,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: tokens.token_type,
          expires_in: tokens.expires_in,
          obtainDate: new Date(0),
          expires_date: tokens.expires_date,
          scope: tokens.scope,
          createdAt: new Date(tokens.createdAt),
          updatedAt: new Date(tokens.updatedAt),
        });
      } catch (error) {
        this.logger.error(error.message, error.stack);
      }
    }
  }

  async importStatistics() {
    const file = await fs.readFile(
      `${this.appConfig.get<string>('DB_IMPORT_PATH')}/statistics.json`,
    );
    const statistics = JSON.parse(file.toString());

    for (let i = 0; i < statistics.length; i++) {
      const statistic = statistics[i];
      const parsed = spotifyUri.parse(statistic.uri);

      if (parsed.type === 'track') {
        const parsedTrack = parsed as spotifyUri.Track;
        const trackInstance = await this.songsIngoService.getTrackByUrlId(
          parsedTrack.id,
        );

        if (!trackInstance) {
          continue;
        }

        await this.trackStatistics.create({
          trackId: trackInstance.id,
          likedCount: 0,
          sharedCount: statistic.shareCount,
          createdAt: statistic.createdAt && new Date(statistic.createdAt),
          updatedAt: statistic.updatedAt && new Date(statistic.updatedAt),
        });
      }

      try {
      } catch (error) {
        this.logger.error(error.message, error.stack);
      }
    }
  }
}
