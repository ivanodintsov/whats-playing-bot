import {
  Args,
  Query,
  Resolver,
  ResolveField,
  Parent,
  Context,
  ArgsType,
  Field,
} from '@nestjs/graphql';
import { Link, TrackEntity, TrackEntityResponse } from './models/track.model';
import { LinksService } from 'src/songs-info/links/links.service';
import { Track } from 'src/songs-info/models/track.model';
import { TrackPlaylistService } from 'src/track-playlist/track-playlist.service';
import {
  GetPlatformTrackArgs,
  GetSongArgs,
  GetSongByURIArgs,
  TrackDomainResponseDTO,
} from './dto/song.dto';
import { SongsInfoService } from 'src/songs-info/songs-info.service';
import { plainToClass } from 'class-transformer';
import { TrackDomainDbDTO } from 'src/songs-info/types/parser';
import { TrackStatisticsService } from 'src/songs-info/track-statistics/track-statistics.service';
import { CACHE_MANAGER, Inject, NotFoundException } from '@nestjs/common';
import * as getYouTubeID from 'get-youtube-id';
import { Cache } from 'cache-manager';
import { PlatformTrackEntityResponse } from './models/platform-track.model';
import * as spotifyUri from 'spotify-uri';
import { parseTidalUrl } from 'src/utils/parseTidalUrl';

const servicesData = {
  spotify: {
    color: '#1feb6a',
    name: 'Spotify',
  },
  itunes: {
    name: 'Apple Music',
    color: '#fa57c1',
    deepLink: 'music://',
  },
  youtubeMusic: {
    name: 'Youtube Music',
    color: '#ff0000',
    deepLink: 'youtubemusic://',
  },
  youtube: {
    name: 'Youtube',
    color: '#ff0000',
    deepLink: 'vnd.youtube://',
  },
  tidal: {
    name: 'Tidal',
    color: '#000000',
    deepLink: 'tidal://',
  },
  itunesStore: {
    name: 'iTunes Store',
    color: '#fa57c1',
  },
  lineMusic: {
    name: 'Line Music',
    color: '#0ee071',
  },
};

@Resolver(() => TrackEntity)
export class TrackEntityResolver {
  constructor(
    private readonly linksService: LinksService,
    private readonly trackPlaylistService: TrackPlaylistService,
    private readonly songInfoService: SongsInfoService,
    private readonly trackStatisticsService: TrackStatisticsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

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
    return (track.links || []).map(link => {
      let providerId;

      if (link.provider === 'youtube') {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const id = getYouTubeID(link.url, { fuzzy: false });
        providerId = id;
      }

      if (link.provider === 'spotify') {
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

      return {
        ...link,
        url: this.linksService.createTrackUrlFromData(track._raw, link, {
          platform: 'frontend',
        }),
        providerId,
      };
    });
  }

  @Query(() => TrackEntityResponse)
  async getSong(@Args() args: GetSongArgs) {
    const value = await this.cacheManager.get(`song${args.songId}`);

    if (value) {
      return value;
    }

    const song: Track = await this.songInfoService.getTrackById(args.songId);

    if (!song) {
      throw new NotFoundException();
    }

    const songDomain = plainToClass(TrackDomainDbDTO, song.toJSON());
    const [statistics] = await this.trackStatisticsService.findOne(args.songId);

    const response = {
      data: plainToClass(TrackDomainResponseDTO, songDomain),
      statistics,
    };

    await this.cacheManager.set(`song${args.songId}`, response, { ttl: 10 });

    return response;
  }

  @Query(() => TrackEntityResponse)
  async getSongBySpotifyURI(@Args() args: GetSongByURIArgs) {
    const value = await this.cacheManager.get(`song${args.songURI}`);

    if (value) {
      return value;
    }

    const song: Track = await this.songInfoService.getTrackBySpotifyURI(
      args.songURI,
    );

    if (!song) {
      throw new NotFoundException();
    }

    const songDomain = plainToClass(TrackDomainDbDTO, song.toJSON());
    const [statistics] = await this.trackStatisticsService.findOne(song.id);

    const response = {
      data: plainToClass(TrackDomainResponseDTO, songDomain),
      statistics,
    };

    await this.cacheManager.set(`song${args.songURI}`, response, { ttl: 10 });

    return response;
  }

  @Query(() => PlatformTrackEntityResponse)
  async getPlarformTrack(@Args() args: GetPlatformTrackArgs) {
    const value = await this.cacheManager.get(
      `song${args.songId}.${args.platform}`,
    );

    if (value) {
      return value;
    }

    const song: Track = await this.songInfoService.getTrackById(args.songId);

    if (!song) {
      throw new NotFoundException();
    }

    const serviceData = servicesData[args.platform];
    const songDomain = plainToClass(TrackDomainDbDTO, song.toJSON());
    const linkItem = song.links.find(link => link.provider === args.platform);
    const link = linkItem.url;

    const response = {
      data: plainToClass(TrackDomainResponseDTO, songDomain),
      links: this.createDeepLink(args.platform, link, serviceData?.deepLink),
    };

    await this.cacheManager.set(
      `song${args.songId}.${args.platform}`,
      response,
      { ttl: 10 },
    );

    return response;
  }

  private createDeepLink(service: string, link: string, prefix: string) {
    if (service === 'spotify') {
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
