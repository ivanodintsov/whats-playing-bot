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
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  SONGS_INFO_CHANNEL,
  SONGS_INFO_EXTERNAL_DATA_CHANNEL,
  SONGS_INFO_PARSE_AND_CREATE,
  SONGS_INFO_PARSE_BY_URL,
  SONGS_INFO_PROCESS_TRACK,
  SONGS_INFO_QUEUE,
} from './constants';
import { ProcessUpdateFromSongWhipData } from './songs-info.processor';
import { DistributedSingleFlightService } from 'src/distributed-single-flight/distributed-single-flight.service';

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

    @InjectQueue(SONGS_INFO_QUEUE)
    private readonly songsInfoQueue: Queue,

    private readonly distributedSingleFlightService: DistributedSingleFlightService,
  ) {
    this.parsers = {
      [spotifyParser.type]: spotifyParser,
      [soundcloudParser.type]: soundcloudParser,
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
        const tokens = await this.tokensPoolService.acquireBackground({
          service: parser.musicServiceProvider,
        });

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
      } catch (error) {
        this.logger.debug(error.message, error.stack);
      }
    }
  };

  processParseTrackByTrackUrl(url: string) {
    return this.parseTrackByTrackUrl(url);
  }

  private async parseTrackByTrackUrl(url: string) {
    const parserData = await this.getParser(url);

    if (!parserData) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    const { parser } = parserData;

    const tokens = await this.tokensPoolService.acquireBackground({
      service: parser.musicServiceProvider,
    });

    let song: ITrack | null = null;

    try {
      song = await parser.parseSong({
        url: parserData.url,
        tokens,
      });
    } finally {
      await tokens.release();
    }

    if (!song) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    const parsersList = Object.values(this.parsers);

    for (let index = 0; index < parsersList.length; index++) {
      const parser = parsersList[index];
      try {
        const tokens = await this.tokensPoolService.acquireBackground({
          service: parser.musicServiceProvider,
        });

        try {
          if (parser.type === parserData.parser.type) {
            continue;
          }

          song = await parser.updateSong({ song, tokens });
        } finally {
          await tokens.release();
        }
      } catch (error) {
        this.logger.debug(error.message, error.stack);
      }
    }

    return song;
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

    const tokens = await this.tokensPoolService.acquireBackground({
      service: serviceParser.musicServiceProvider,
    });

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

  async parseAlbum(service: Provider, albumId: string) {
    const serviceParser = this.parsers[service];
    if (!serviceParser) {
      throw new HttpException('Unknown parser service', HttpStatus.NOT_FOUND);
    }

    const tokens = await this.tokensPoolService.acquireBackground({
      service: serviceParser.musicServiceProvider,
    });

    try {
      const { album, rawAlbum } = await serviceParser.getAlbum({
        albumId,
        tokens,
      });
      await this.songsService.createAlbum(service, album, false);
    } finally {
      await tokens.release();
    }
  }

  async processAlbumTracks(service: Provider, albumId: string, data: any) {
    const serviceParser = this.parsers[service];
    if (!serviceParser) {
      throw new HttpException('Unknown parser service', HttpStatus.NOT_FOUND);
    }
    const tokens = await this.tokensPoolService.acquireBackground({
      service: serviceParser.musicServiceProvider,
    });

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

  async processTrackByTrackId(service: Provider, trackId: string) {
    const response = await this.distributedSingleFlightService.execute({
      channel: SONGS_INFO_PROCESS_TRACK,
      key: `${service}:${trackId}`,
      timeout: 30,
      owner: () => this._processTrackByTrackIdExecute(service, trackId),
      waiter: (response) => {},
    });

    return response;
  }

  async addTrackIsrcs(trackId, isrcs: string[]) {
    return this.songsService.addTrackIsrcs(trackId, isrcs);
  }

  createSongUrl(track: Pick<ITrack, 'id'>) {
    return `${this.appConfig.get<string>('FRONTEND_URL')}/song/${fromUUID({
      value: track.id,
    })}/`;
  }

  createShortSongId(track: Pick<ITrack, 'id'>) {
    return fromUUID({
      value: track.id,
    });
  }

  getTrackById(id: string, fields?: Record<string, any>) {
    return this.songsService.getTrackById(id, fields);
  }

  getTrackBySpotifyURI(providerId: string, fields?: Record<string, any>) {
    return this.songsService.getTrackByProviderId(
      {
        providerId,
        provider: SERVICES_PROVIDERS.spotify,
      },
      fields,
    );
  }

  async parseTrackByUrl(data: { url: string }) {
    const { parser, url } = await this.getParser(data.url);
    let track = await this.songsService.getSimpleTrackByUrl(url.data.url);

    if (!track) {
      await this.parseSongAndCreate(
        MUSIC_SERVICE_NAMES_BY_PROVIDERS[parser.musicServiceProvider],
        url.data.url,
      );
      track = await this.songsService.getSimpleTrackByUrl(url.data.url);
    }

    try {
      await this.updateFromSongWhip({
        url: url.data.url,
        track,
      });
    } catch (error) {
      this.logger.debug(error.message, error.stack);
    }

    track = await this.songsService.getTrackByUrl(url.data.url);

    return track;
  }

  async parseTrackByTrackEntity(entity: TrackEntity) {
    const response = await this.distributedSingleFlightService.execute({
      channel: SONGS_INFO_CHANNEL,
      key: entity.url,
      timeout: 30,
      owner: () => this._parseTrackByTrackEntityExecute(entity),
      waiter: (trackId) => this.songsService.getTrackById(trackId),
    });

    return response;
  }

  async updateFromExternalByTrackId(data: {
    url: string;
    trackId: Track['id'];
  }) {
    const response = await this.distributedSingleFlightService.execute({
      channel: SONGS_INFO_EXTERNAL_DATA_CHANNEL,
      key: data.url,
      timeout: 30,
      owner: () => this._updateFromExternalByTrackIdExecute(data),
      waiter: (trackId) => this.songsService.getTrackById(trackId),
    });

    return response;
  }

  private async _processTrackByTrackIdExecute(
    service: Provider,
    trackId: string,
  ) {
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

    const { track, link } = await this.getTrackAndCreate(
      serviceParser,
      trackId,
    );

    try {
      await this.addTracktoUpdateFromSongWhipQueue({
        url: link.providerUrl,
        trackId: track['id'],
      });
    } catch (error) {
      this.logger.debug(error.message, error.stack);
    }
  }

  private async parseSongAndCreate(
    provider: Provider,
    url: string,
    oldId?: string,
  ) {
    const response = await this.distributedSingleFlightService.execute({
      channel: SONGS_INFO_PARSE_AND_CREATE,
      key: url,
      timeout: 30,
      owner: () => this._parseSongAndCreateExecute(provider, url, oldId),
      waiter: (response) => this.songsService.getTrackById(response.track.id),
    });

    return response;
  }

  private async getTrackAndCreate(parser: ParserService, trackId: string) {
    const tokens = await this.tokensPoolService.acquireBackground({
      service: parser.musicServiceProvider,
    });

    try {
      const { track: parsedTrack } = await parser.getTrack({
        id: trackId,
        tokens,
      });

      return this.songsService.createSong(
        parser.providerName,
        parsedTrack,
        false,
      );
    } finally {
      await tokens.release();
    }
  }

  private async _parseSongAndCreateExecute(
    provider: Provider,
    url: string,
    oldId?: string,
  ) {
    const song = await this.parseTrackByTrackUrl(url);

    return this.songsService.createSong(provider, { ...song, oldId: oldId });
  }

  private async _parseTrackByTrackEntityExecute(entity: TrackEntity) {
    const PARSER_MAP: Record<MUSIC_SERVICE_PROVIDERS, ParserService> = {
      [MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD]: this.soundcloudParser,
      [MUSIC_SERVICE_PROVIDERS.SPOTIFY]: this.spotifyParser,
    };
    const parser = PARSER_MAP[entity.provider];

    if (!parser) {
      return;
    }

    const tokens = await this.tokensPoolService.acquireBackground({
      service: parser.musicServiceProvider,
    });

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

    const parseResponse = await this.parseSongAndCreate(
      MUSIC_SERVICE_NAMES_BY_PROVIDERS[parser.musicServiceProvider],
      parsedUrl.data.url,
    );

    return parseResponse.id;
  }

  private async _updateFromExternalByTrackIdExecute({
    url,
    trackId,
  }: {
    url: string;
    trackId: Track['id'];
  }) {
    const track = await this.songsService.getSimpleTrackByid(trackId);

    if (!track) {
      return;
    }

    await this.updateFromSongWhip({
      url: url,
      track,
    });

    return trackId;
  }

  private async addTracktoUpdateFromSongWhipQueue(
    data: ProcessUpdateFromSongWhipData,
  ) {
    try {
      await this.songsInfoQueue.add('updateFromSongWhip', data, {
        attempts: 1,
        removeOnComplete: true,
      });
    } catch (error) {
      this.logger.debug(error.message, error.stack);
    }
  }

  private async updateFromSongWhip({
    url,
    track,
  }: {
    url: string;
    track: Track;
  }) {
    let songWhipData;
    try {
      songWhipData = await this.songWhipService.getSong({
        url,
        country: 'us',
      });
    } catch (error) {
      this.logger.debug(error.message, error.stack);
    }

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
        this.logger.debug(error.message, error.stack);
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
}
