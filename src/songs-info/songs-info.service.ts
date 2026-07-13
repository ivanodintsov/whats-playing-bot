import { Injectable } from '@nestjs/common';
import {
  ArtistSocialDomain,
  IExternalUrls,
  SOCIAL_STATUSES,
  ITrack,
} from 'src/music-services/music-service-core/types';
import { ParserService } from './parser/parser.service';
import { SERVICES_PROVIDERS } from './parser/constants';
import { Provider } from './parser/types';
import { SpotifyParserService } from './spotify-parser/spotify-parser.service';
import { ParserMusicServiceURL } from './types/parser';
import { HttpException, HttpStatus } from '@nestjs/common';
import { SongsService } from './songs/songs.service';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import { Track } from './models/track.model';
import { LINK_TYPE } from 'src/music-services/music-service-core/types';
import { Logger } from 'src/logger';
import { fromUUID } from 'src/utils/shortUUID';
import { ConfigService } from '@nestjs/config';
import { SoundcloudParserService } from './soundcloud-parser/soundcloud-parser.service';
import { TrackEntity } from 'src/music-services/domain/Track';
import {
  MUSIC_SERVICE_PROVIDERS,
  MUSIC_SERVICE_NAMES_BY_PROVIDERS,
} from 'src/constants';
import { TokensPoolService } from './tokens-pool/tokens-pool.service';
import { InternalURIParser } from 'src/music-services/music-services-uri-parser/internal-uri';

// import { TidalParserService } from './tidal-parser/tidal-parser.service';

@Injectable()
export class SongsInfoService {
  private readonly parsers: Record<string, ParserService>;
  private readonly logger = new Logger(SongsInfoService.name);

  constructor(
    private songsService: SongsService,
    private songWhipService: SongWhipService,
    private readonly spotifyParser: SpotifyParserService,
    private readonly soundcloudParser: SoundcloudParserService,
    private readonly appConfig: ConfigService,
    private readonly tokensPoolService: TokensPoolService,
  ) {
    this.parsers = {
      [spotifyParser.type]: spotifyParser,
      [soundcloudParser.type]: soundcloudParser,
      // [youtubeParser.type]: youtubeParser,
      // [tidalParser.type]: tidalParser,
    };
  }

  getParser = async (
    url: string,
  ): Promise<{
    parser: ParserService;
    url: ParserMusicServiceURL;
  }> => {
    const parsersList = Object.values(this.parsers);

    for (let index = 0; index < parsersList.length; index++) {
      const parser = parsersList[index];
      try {
        const tokens = await this.tokensPoolService.acquire(
          parser.musicServiceProvider,
        );
        try {
          const parsedUrl = await parser.parseUrl({ url, tokens });

          if (parsedUrl) {
            return {
              parser,
              url: parsedUrl,
            };
          }
        } finally {
          await tokens.release();
        }
      } catch (error) {}
    }
  };

  public async parseSong(url: string) {
    const parserData = await this.getParser(url);

    if (!parserData) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    const { parser } = parserData;

    const tokens = await this.tokensPoolService.acquire(
      parser.musicServiceProvider,
    );

    let song: ITrack | null = null;

    try {
      song = await parser.parseSong({
        url: parserData.url,
        tokens,
      });
    } finally {
      tokens.release();
    }

    if (!song) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    const parsersList = Object.values(this.parsers);

    for (let index = 0; index < parsersList.length; index++) {
      const parser = parsersList[index];
      try {
        const tokens = await this.tokensPoolService.acquire(
          parser.musicServiceProvider,
        );

        try {
          if (parser.type === parserData.parser.type) {
            continue;
          }

          song = await parser.updateSong({ song, tokens });
        } catch (error) {
          this.logger.error(error.message, error.stack);
        } finally {
          await tokens.release();
        }
      } catch (error) {
        this.logger.error(error.message, error.stack);
      }
    }

    return song;
  }

  private async parseSongAndCreate(
    provider: Provider,
    url: string,
    oldId?: string,
  ) {
    const song = await this.parseSong(url);

    return this.songsService.createSong(provider, { ...song, oldId: oldId });
  }

  async parseArtistAlbums(
    service: Provider,
    artistId: string,
    data: any | null,
  ) {
    const serviceParser = this.parsers[service];

    if (!serviceParser) {
      throw new HttpException('Unknown parser service', HttpStatus.NOT_FOUND);
    }

    const tokens = await this.tokensPoolService.acquire(
      serviceParser.musicServiceProvider,
    );

    try {
      const {
        ids,
        data: nextData,
        hasMore,
      } = await serviceParser.getArtistAlbumsIds({
        artistId,
        data,
        tokens,
      });

      await this.songsService.addIdsToQueue(service, ids);

      if (hasMore) {
        await this.songsService.processArtistAlbums(
          service,
          artistId,
          nextData,
        );
      }
    } finally {
      await tokens.release();
    }
  }

  async parseAlbum(service: Provider, albumId: any) {
    const serviceParser = this.parsers[service];
    if (!serviceParser) {
      throw new HttpException('Unknown parser service', HttpStatus.NOT_FOUND);
    }
    const { album, rawAlbum } = await serviceParser.getAlbum(albumId);
    await this.songsService.createAlbum(service, album, false);
  }

  async processAlbumTracks(service: Provider, albumId: any, data: any) {
    const serviceParser = this.parsers[service];
    if (!serviceParser) {
      throw new HttpException('Unknown parser service', HttpStatus.NOT_FOUND);
    }
    const tokens = await this.tokensPoolService.acquire(
      serviceParser.musicServiceProvider,
    );

    try {
      const { ids, data: nextData } = await serviceParser.getAlbumTracksIds({
        albumId,
        data,
        tokens,
      });
      await this.songsService.addTrackIdsToQueue(service, ids);
      if (nextData.hasMore) {
        await this.songsService.processAlbumTracks(service, albumId, nextData);
      }
    } finally {
      await tokens.release();
    }
  }

  async processTrack(service: Provider, trackId: any) {
    const serviceParser = this.parsers[service];

    if (!serviceParser) {
      throw new HttpException('Unknown parser service', HttpStatus.NOT_FOUND);
    }

    const trackInstance = await this.songsService.getSimpleTrackByProviderId(
      service,
      trackId,
    );

    if (trackInstance) {
      return;
    }

    const { track: parsedTrack } = await serviceParser.getTrack(trackId);
    const { track, link } = await this.songsService.createSong(
      service,
      parsedTrack,
      false,
    );

    try {
      await this.updateFromSongWhip({
        url: link.providerUrl,
        track,
      });
    } catch (error) {
      this.logger.error(error.message, error.stack);
    }
  }

  getTrackById(id: string, fields?: any) {
    return this.songsService.getTrackById(id, fields);
  }

  getTrackBySpotifyURI(providerId: string, fields?: any) {
    return this.songsService.getTrackByProviderId(
      {
        providerId,
        provider: SERVICES_PROVIDERS.spotify,
      },
      fields,
    );
  }

  async getSong(data: { url: string; oldId?: string }) {
    const { parser, url } = await this.getParser(data.url);
    let track = await this.songsService.getSimpleTrackByUrl(url.data.url);

    if (!track) {
      await this.parseSongAndCreate(
        MUSIC_SERVICE_NAMES_BY_PROVIDERS[parser.musicServiceProvider],
        url.data.url,
        data.oldId,
      );
      track = await this.songsService.getSimpleTrackByUrl(url.data.url);
    }

    try {
      await this.updateFromSongWhip({
        url: url.data.url,
        track,
      });
    } catch (error) {
      this.logger.error(error.message, error.stack);
    }

    track = await this.songsService.getTrackByUrl(url.data.url);

    return track;
  }

  async getSongByTrackEntity(entity: TrackEntity) {
    const PARSER_MAP: Record<MUSIC_SERVICE_PROVIDERS, ParserService> = {
      [MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD]: this.soundcloudParser,
      [MUSIC_SERVICE_PROVIDERS.SPOTIFY]: this.spotifyParser,
    };
    const parser = PARSER_MAP[entity.provider];

    if (!parser) {
      return;
    }

    const tokens = await this.tokensPoolService.acquire(
      parser.musicServiceProvider,
    );

    let parsedUrl: ParserMusicServiceURL | null = null;

    try {
      parsedUrl = await parser.parseUrl({
        url: entity.url,
        tokens,
      });
    } finally {
      await tokens.release();
    }

    if (!parsedUrl) {
      return;
    }

    let track = await this.songsService.getSimpleTrackByUrl(parsedUrl.data.url);

    await this.parseSongAndCreate(
      MUSIC_SERVICE_NAMES_BY_PROVIDERS[parser.musicServiceProvider],
      parsedUrl.data.url,
    );

    track = await this.songsService.getSimpleTrackByUrl(parsedUrl.data.url);

    try {
      await this.updateFromSongWhip({
        url: parsedUrl.data.url,
        track,
      });
    } catch (error) {
      this.logger.error(error.message, error.stack);
    }

    track = await this.songsService.getTrackByUrl(parsedUrl.data.url);

    return track;
  }

  async updateFromSongWhip({ url, track }: { url: string; track: Track }) {
    const songWhipData = await this.songWhipService.getSong({
      url,
      country: 'us',
    });

    if (!songWhipData) {
      return;
    }

    for (let i = 0; i < songWhipData?.artists?.length; i++) {
      const artist = songWhipData.artists[i];
      try {
        if (!artist.sourceUrl) {
          continue;
        }

        const artistInstance = await this.songsService.getArtistByUrl(
          artist.sourceUrl,
        );

        if (!artistInstance) {
          continue;
        }

        const links: IExternalUrls = Object.entries(artist?.links || {})
          .map(([key, links]) => {
            const link = links?.[0];

            if (!link) {
              return;
            }

            return {
              provider: key as Provider,
              providerUrl: link.link,
              providerId: artist.serviceIds[key] || null,
              type: LINK_TYPE.ARTIST,
            };
          })
          .filter(Boolean);

        await this.songsService.createLinks(
          artistInstance,
          LINK_TYPE.ARTIST,
          links,
        );
      } catch (error) {
        this.logger.error(error.message, error.stack);
      }
    }

    const links: IExternalUrls = Object.entries(songWhipData?.links || {})
      .map(([key, links]) => {
        const link = links?.[0];

        if (!link) {
          return;
        }

        return {
          provider: key as Provider,
          providerUrl: link.link,
          providerId: link.providerId || null,
          type: LINK_TYPE.TRACK,
        };
      })
      .filter(Boolean);

    await this.songsService.createLinks(track, LINK_TYPE.TRACK, links);
    await this.songsService.updateAlbumImage(track, songWhipData.image);
  }

  async addArtistSocialToTrack(
    trackId: string,
    social: Omit<ArtistSocialDomain, 'artistId'>,
  ) {
    const track = await this.songsService.getTrackWithAlbumAndArtists(trackId);

    if (!track) {
      return false;
    }

    for (let i = 0; i < track.album?.artists?.length; i++) {
      const artist = track.album?.artists[i];

      await this.songsService.createArtistSocial({
        artistId: artist.id,
        status:
          track.album?.artists?.length > 1
            ? SOCIAL_STATUSES.WAIT_MODERATION
            : social.status,
        ...social,
      });
    }
  }

  async addTrackIsrcs(trackId, isrcs: string[]) {
    return this.songsService.addTrackIsrcs(trackId, isrcs);
  }

  getTrackByUrlId(id: string) {
    return this.songsService.getTrackByUrlId(id);
  }

  createSongUrl(track: Pick<ITrack, 'id'>) {
    return `${this.appConfig.get<string>('FRONTEND_URL')}/song/${fromUUID({
      value: track.id,
    })}/`;
  }

  createSongId(track: Pick<ITrack, 'id'>) {
    return fromUUID({
      value: track.id,
    });
  }
}
