import { Injectable } from '@nestjs/common';

import {
  ParserService,
  Provider,
  SERVICES_PROVIDERS,
} from './parser/parser.service';

import { SpotifyParserService } from './spotify-parser/spotify-parser.service';
import {
  ArtistSocialDomain,
  IExternalUrls,
  ParsedURL,
  SOCIAL_STATUSES,
  ITrack,
} from './types/parser';
import { YoutubeParserService } from './youtube-parser/youtube-parser.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { SongsService } from './songs/songs.service';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import { Track } from './models/track.model';
import { LINK_TYPE } from './models/link.model';
import { Logger } from 'src/logger';
import { fromUUID } from 'src/graphql-frontend/dto/utils';
import { ConfigService } from '@nestjs/config';

// import { TidalParserService } from './tidal-parser/tidal-parser.service';

@Injectable()
export class SongsInfoService {
  private readonly parsers: Record<string, ParserService>;
  private readonly logger = new Logger(SongsInfoService.name);

  constructor(
    private songsService: SongsService,
    private songWhipService: SongWhipService,
    private readonly spotifyParser: SpotifyParserService,
    private readonly youtubeParser: YoutubeParserService, // private readonly tidalParser: TidalParserService,
    private readonly appConfig: ConfigService,
  ) {
    this.parsers = {
      [spotifyParser.type]: spotifyParser,
      // [youtubeParser.type]: youtubeParser,
      // [tidalParser.type]: tidalParser,
    };
  }

  private getParser = (
    url: string,
  ): {
    parser: ParserService;
    url: ParsedURL;
  } => {
    const parsersList = Object.values(this.parsers);

    for (let index = 0; index < parsersList.length; index++) {
      const parser = parsersList[index];
      try {
        const parsedUrl = parser.parseUrl(url);

        if (parsedUrl) {
          return {
            parser,
            url: parsedUrl,
          };
        }
      } catch (error) {}
    }
  };

  public async parseSong(url: string) {
    const parserData = this.getParser(url);

    if (!parserData) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    const { parser } = parserData;

    let song = await parser.parseSong(parserData.url);

    const parsersList = Object.values(this.parsers);

    for (let index = 0; index < parsersList.length; index++) {
      const parser = parsersList[index];
      try {
        if (parser.type === parserData.parser.type) {
          continue;
        }

        song = await parser.updateSong(song);
      } catch (error) {
        this.logger.error(error.message, error.stack);
      }
    }

    return song;
  }

  public async parseSongAndCreate(url: string, oldId?: string) {
    const song = await this.parseSong(url);

    return this.songsService.createSong('spotify', { ...song, oldId: oldId });
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

    const {
      ids,
      data: nextData,
      hasMore,
    } = await serviceParser.getArtistAlbumsIds(artistId, data);

    await this.songsService.addIdsToQueue(service, ids);

    if (hasMore) {
      await this.songsService.processArtistAlbums(service, artistId, nextData);
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
    const { ids, data: nextData } = await serviceParser.getAlbumTracksIds(
      albumId,
      data,
    );
    await this.songsService.addTrackIdsToQueue(service, ids);
    if (nextData.hasMore) {
      await this.songsService.processAlbumTracks(service, albumId, nextData);
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
    await this.updateFromSongWhip({
      url: link.providerUrl,
      track,
    });
  }

  getTrackById(id: string) {
    return this.songsService.getTrackById(id);
  }

  getTrackBySpotifyURI(providerId: string) {
    return this.songsService.getTrackByProviderId({
      providerId,
      provider: SERVICES_PROVIDERS.spotify,
    });
  }

  async getSong({ url, oldId }: { url: string; oldId?: string }) {
    let track = await this.songsService.getSimpleTrackByUrl(url);

    if (!track) {
      await this.parseSongAndCreate(url, oldId);
      track = await this.songsService.getSimpleTrackByUrl(url);
    }

    try {
      await this.updateFromSongWhip({
        url,
        track,
      });
    } catch (error) {
      this.logger.error(error.message, error.stack);
    }

    track = await this.songsService.getTrackByUrl(url);

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
            };
          })
          .filter(el => el);

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
          providerId: null,
        };
      })
      .filter(el => el);

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
