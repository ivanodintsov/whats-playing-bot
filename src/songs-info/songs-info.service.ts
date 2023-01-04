import { Injectable } from '@nestjs/common';

import { ParserService } from './parser/parser.service';

import { SpotifyParserService } from './spotify-parser/spotify-parser.service';
import {
  ArtistSocialDomain,
  IExternalUrls,
  ParsedURL,
  SOCIAL_STATUSES,
} from './types/parser';
import { YoutubeParserService } from './youtube-parser/youtube-parser.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { SongsService } from './songs/songs.service';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import { Track } from './models/track.model';
import { LINK_TYPE } from './models/link.model';
import { Logger } from 'src/logger';

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

    return this.songsService.createSong('spotify', song);
  }

  getTrackById(id: string) {
    return this.songsService.getTrackById(id);
  }

  async getSong({ url }: { url: string }) {
    let track = await this.songsService.getSimpleTrackByUrl(url);

    if (!track) {
      await this.parseSong(url);
      track = await this.songsService.getSimpleTrackByUrl(url);
    }

    await this.updateFromSongWhip({
      url,
      track,
    });

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
              provider: key,
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
          provider: key,
          providerUrl: link.link,
          providerId: null,
        };
      })
      .filter(el => el);

    await this.songsService.createLinks(track, LINK_TYPE.TRACK, links);

    // track.al;
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
}
