import {
  Args,
  Query,
  Resolver,
  ResolveField,
  Parent,
  Context,
  Info,
} from '@nestjs/graphql';
import { fieldsMap } from 'graphql-fields-list';
import {
  GetPlatformTrackArgs,
  GetSongArgs,
  GetSongByURIArgs,
  GetSongByURLArgs,
  Link,
  ShareTrackArgs,
  ShareTrackResponseDTO,
  TRACK_STATUS,
  TrackEntity,
  TrackEntityResponse,
  TrackStatusResponse,
} from './models/track.model';
import { LinksService } from 'src/songs-info/links/links.service';
import { Track } from 'src/songs-info/models/track.model';
import { TrackPlaylistService } from 'src/track-playlist/track-playlist.service';
import { TrackDomainResponseDTO } from './dto/song.dto';
import { SongsInfoService } from 'src/songs-info/songs-info.service';
import { plainToClass } from 'class-transformer';
import { TrackDomainDbDTO } from 'src/music-services/music-service-core/dto';
import { TrackStatisticsService } from 'src/songs-info/track-statistics/track-statistics.service';
import { Inject, NotFoundException, UseGuards } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as getYouTubeID from 'get-youtube-id';
import { Cache } from 'cache-manager';
import { PlatformTrackEntityResponse } from './models/platform-track.model';
import * as spotifyUri from 'spotify-uri';
import { parseTidalUrl } from 'src/utils/parseTidalUrl';
import { InjectQueue } from '@nestjs/bull';
import { FRONTEND_QUEUE } from './constants';
import { Queue } from 'bull';
import { ProcessTrackData } from './frontend.processor';
import { User } from './auth/user';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';
import { TelegramBotService } from 'src/telegram/bot.service';
import { MAIN_TELEGRAM_BOT_SERVICE_NAME } from 'src/telegram/constants';
import { Cacheable } from './cache.plugin';
import {
  MUSIC_SERVICE_PROVIDER_NAMES,
  MusicServiceConfig,
} from 'src/constants';
import { AutherizedContext } from 'src/auth/types';
import { InjectModel } from '@nestjs/sequelize';
import { UseAdaptiveThrottlerGuards } from './throttler/guards/use-adaptive-throttler-guards';
import { SSRThrottlerGuard } from './throttler/guards/ssr-throttler-guard';
import { AnonymousThrottlerGuard } from './throttler/guards/anonymous-throttler-guard';
import { ThrottlerGqlAuth } from './throttler/guards/throttler-gql-auth';

@Resolver(() => TrackEntity)
export class TrackEntityResolver {
  constructor(
    private readonly linksService: LinksService,
    private readonly trackPlaylistService: TrackPlaylistService,
    private readonly songInfoService: SongsInfoService,
    private readonly trackStatisticsService: TrackStatisticsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectQueue(FRONTEND_QUEUE)
    private readonly frontendQueue: Queue<ProcessTrackData>,

    @Inject(MAIN_TELEGRAM_BOT_SERVICE_NAME)
    private readonly botService: TelegramBotService,

    @InjectModel(TelegramUser)
    private readonly telegramUserModel: typeof TelegramUser,
  ) {}

  @UseAdaptiveThrottlerGuards(
    {
      guard: SSRThrottlerGuard,
      config: {
        default: {
          limit: 15,
        },
      },
    },
    {
      guard: AnonymousThrottlerGuard,
      config: {
        default: {
          limit: 15,
        },
      },
    },
  )
  @Query(() => [TrackEntity])
  async chatPlaylists(@Args('chatId', { type: () => String }) chatId: string) {
    const response = await this.trackPlaylistService.getLastChatTracks(
      chatId,
      10,
    );

    return response;
  }

  @ResolveField('links', () => [Link])
  async links(
    @Parent() track: TrackDomainResponseDTO,
    @Context() context: any,
  ) {
    return (track.links || []).map((link) => {
      let providerId: string, url: string;

      if (link.provider === 'youtube') {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const id = getYouTubeID(link.url, { fuzzy: false });
        providerId = id;
      }

      if (link.provider === MUSIC_SERVICE_PROVIDER_NAMES.SPOTIFY) {
        if (link.providerId) {
          providerId = link.providerId;
        } else {
          const parsedLink = spotifyUri.parse(link.providerUrl);

          if (parsedLink.type === 'track') {
            const parsed = parsedLink as spotifyUri.Track;
            providerId = parsed.id;
          }
        }
      }

      if (link.provider === MUSIC_SERVICE_PROVIDER_NAMES.SOUNDCLOUD) {
        providerId = link.providerId;
        url = link.providerUrl;
      }

      if (!url) {
        url = this.linksService.createTrackUrlFromData(track._raw, link, {
          platform: 'frontend',
        });
      }

      return {
        ...link,
        url,
        providerId,
      };
    });
  }

  @UseAdaptiveThrottlerGuards(
    {
      guard: SSRThrottlerGuard,
      config: {
        default: {
          limit: 30,
        },
      },
    },
    {
      guard: AnonymousThrottlerGuard,
      config: {
        default: {
          limit: 30,
        },
      },
    },
  )
  @Cacheable({ ttl: 60000 })
  @Query(() => TrackEntityResponse)
  async getSong(@Args() args: GetSongArgs, @Info() info: any) {
    const fields = fieldsMap(info, { skip: ['*__*'] });

    const song: Track = await this.songInfoService.getTrackById(
      args.songId,
      // TODO
      fields?.data as any,
    );

    if (!song) {
      throw new NotFoundException();
    }

    const songDomain = plainToClass(
      TrackDomainDbDTO,
      song.toJSON ? song.toJSON() : song,
    );
    const [statistics] = await this.trackStatisticsService.findOne(args.songId);

    const response = {
      data: plainToClass(TrackDomainResponseDTO, songDomain),
      statistics,
    };

    return response;
  }

  @UseAdaptiveThrottlerGuards(
    {
      guard: SSRThrottlerGuard,
      config: {
        default: {
          limit: 30,
        },
      },
    },
    {
      guard: AnonymousThrottlerGuard,
      config: {
        default: {
          limit: 30,
        },
      },
    },
  )
  @Query(() => TrackStatusResponse)
  async getSongByURL(@Args() args: GetSongByURLArgs) {
    const parserData = await this.songInfoService.getParser(args.url);

    if (!parserData) {
      throw new NotFoundException();
    }

    const isSongInProcess = await this.cacheManager.get<{
      status: TRACK_STATUS;
      id?: string;
    }>(`song-process${parserData.url.data.url}`);

    if (isSongInProcess) {
      if (isSongInProcess.status === TRACK_STATUS.notFound) {
        throw new NotFoundException();
      }

      return isSongInProcess;
    }

    await this.cacheManager.set(`song-process${parserData.url.data.url}`, {
      status: TRACK_STATUS.processing,
    });

    await this.frontendQueue.add(
      'frontendProcessTrackURL',
      { url: parserData.url.data.url },
      {
        attempts: 1,
        removeOnComplete: true,
      },
    );

    return { status: TRACK_STATUS.processing };
  }

  @UseAdaptiveThrottlerGuards(
    {
      guard: SSRThrottlerGuard,
      config: {
        default: {
          limit: 30,
        },
      },
    },
    {
      guard: AnonymousThrottlerGuard,
      config: {
        default: {
          limit: 30,
        },
      },
    },
  )
  @Cacheable({ ttl: 60000 })
  @Query(() => TrackEntityResponse)
  async getSongBySpotifyURI(@Args() args: GetSongByURIArgs, @Info() info: any) {
    const fields = fieldsMap(info, { skip: ['*__*'] });

    const song: Track = await this.songInfoService.getTrackBySpotifyURI(
      args.songURI,
      // TODO
      fields?.data as any,
    );

    if (!song) {
      throw new NotFoundException();
    }

    const songDomain = plainToClass(
      TrackDomainDbDTO,
      song.toJSON ? song.toJSON() : song,
    );
    const [statistics] = await this.trackStatisticsService.findOne(song.id);

    const response = {
      data: plainToClass(TrackDomainResponseDTO, songDomain),
      statistics,
    };

    return response;
  }

  @UseAdaptiveThrottlerGuards(
    {
      guard: SSRThrottlerGuard,
      config: {
        default: {
          limit: 30,
        },
      },
    },
    {
      guard: AnonymousThrottlerGuard,
      config: {
        default: {
          limit: 30,
        },
      },
    },
  )
  @Cacheable({ ttl: 60000 })
  @Query(() => PlatformTrackEntityResponse)
  async getPlarformTrack(@Args() args: GetPlatformTrackArgs) {
    const song: Track = await this.songInfoService.getTrackById(args.songId);

    if (!song) {
      throw new NotFoundException();
    }

    const serviceData = MusicServiceConfig[args.platform];
    const songDomain = plainToClass(
      TrackDomainDbDTO,
      song.toJSON ? song.toJSON() : song,
    );
    const linkItem = song.links.find((link) => link.provider === args.platform);
    const link = linkItem.url;

    const response = {
      data: plainToClass(TrackDomainResponseDTO, songDomain),
      links: this.createDeepLink(
        args.platform,
        link,
        linkItem,
        'track',
        serviceData?.deepLink,
      ),
    };

    return response;
  }

  @ThrottlerGqlAuth(10)
  @Query(() => ShareTrackResponseDTO)
  async shareTrack(
    @User() user: AutherizedContext,
    @Args() args: ShareTrackArgs,
  ) {
    try {
      const parserData = await this.songInfoService.getParser(args.url);

      const tgUser = await this.telegramUserModel.findOne({
        where: {
          userId: user.user.id,
        },
      });

      if (!tgUser) {
        return;
      }

      const data = await this.botService.createSongInlineMessage(
        tgUser,
        parserData.url,
      );

      return {
        data,
      };
    } catch (error) {
      console.log(error);
    }
  }

  private createDeepLink(
    service: string,
    link: string,
    linkEntity: Link,
    linkType: 'track',
    prefix: string,
  ) {
    if (service === MUSIC_SERVICE_PROVIDER_NAMES.SPOTIFY) {
      const parsedLink = spotifyUri.parse(link);

      if (parsedLink.type === 'track') {
        const parsed = parsedLink as spotifyUri.Track;
        const deepLink = `spotify://${parsed.type}/${parsed.id}`;

        return {
          ios: deepLink,
          android: deepLink,
          desktop: deepLink,
          web: link,
        };
      }
    }

    if (service === 'youtube') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const id = getYouTubeID(link, { fuzzy: false });

      if (id) {
        return {
          ios: `vnd.youtube://www.youtube.com/watch?v=${id}&v=${id}`,
          android: `intent://www.youtube.com/watch?v=${id}#Intent;package=com.google.android.youtube;scheme=https;end`,
          desktop: null,
          web: link,
        };
      }
    }

    if (service === 'youtubeMusic') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const id = getYouTubeID(link, { fuzzy: false });

      if (id) {
        return {
          ios: `youtubemusic://watch?v=${id}`,
          android: `intent://music.youtube.com/watch?v=${id}#Intent;package=com.google.android.apps.youtube.music;scheme=http;end`,
          desktop: null,
          web: link,
        };
      }
    }

    if (service === 'itunes') {
      const linkNoHttp = link.replace(/https?:\/\//, '');

      return {
        ios: `music://${linkNoHttp}`,
        android: `intent://${linkNoHttp}/#Intent;package=com.apple.android.music;scheme=https;end&i=1598596948&app=music`,
        desktop: `music://${linkNoHttp}`,
        web: link,
      };
    }

    if (service === MUSIC_SERVICE_PROVIDER_NAMES.SOUNDCLOUD) {
      if (linkEntity.providerId && linkType === 'track') {
        return {
          ios: `soundcloud://tracks/${linkEntity.providerId}`,
          android: `soundcloud://tracks/${linkEntity.providerId}`,
          desktop: null,
          web: link,
        };
      }

      return {
        ios: null,
        android: null,
        desktop: null,
        web: link,
      };
    }

    if (service === 'tidal') {
      const tidalUrl = parseTidalUrl(link);

      if (!tidalUrl) {
        return {
          ios: null,
          android: null,
          desktop: null,
          web: link,
        };
      }

      return {
        ios: `tidal://${tidalUrl.url.type}/${tidalUrl.url.id}/`,
        android: `intent://tidal.com/${tidalUrl.url.type}/${tidalUrl.url.id}/#Intent;package=com.aspiro.tidal;scheme=https;end`,
        desktop: null,
        web: link,
      };
    }

    return {
      ios: null,
      android: null,
      desktop: null,
      web: link,
    };
  }
}
