import { Injectable } from '@nestjs/common';
import {
  MUSIC_SERVICE_PROVIDER_NAMES,
  MUSIC_SERVICE_PROVIDERS,
} from 'src/constants';
import { ParserService } from '../parser/parser.service';
import {
  GetFinalSongFromSearchContext,
  ParserContext,
  ParseSongContext,
  ParseURLContext,
  SearchSongContext,
  UpdateSongContext,
} from '../parser/types';
import {
  IAlbum,
  IArtist,
  ITrack,
} from 'src/music-services/music-service-core/types';
import {
  SoundCloudResourceType,
  SoundCloudUriType,
  SoundCloudURNParser,
} from './soundcloud-urn-parser';
import { SoundcloudService } from 'src/music-services/soundcloud-service/soundcloud-service.service';
import {
  ParserMusicServiceURLType,
  ParserSoundcloudURL,
} from '../types/parser';
import { SERVICES_PROVIDERS } from '../parser/constants';
import { Maybe } from 'src/typings';
import { ParserTextNormalizer } from '../parser/parset-text-normalizer';
import { ParsedTrackMatcher } from '../parser/parsed-tracks-matcher';

// const spotifyTgUser = {
//   userId: '7ea04c38-128f-48da-a066-ee6b5488f9c3',
//   provider: CLIENT_UNIQUE_PROVIDES.TELEGRAM,
// };

// const soundcloudTgUser = {
//   userId: '64a8957c-b86c-4134-97e7-e9cef2aee5ec',
//   provider: CLIENT_UNIQUE_PROVIDES.TELEGRAM,
// };

@Injectable()
export class SoundcloudParserService extends ParserService {
  public musicServiceProvider = MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD;
  protected readonly _type = MUSIC_SERVICE_PROVIDER_NAMES.SOUNDCLOUD;

  constructor(private readonly soundCloudService: SoundcloudService) {
    super();
  }

  public async parseUrl({
    url,
    tokens,
  }: ParseURLContext): Promise<ParserSoundcloudURL> {
    const parsedUrl = SoundCloudURNParser.parse(url);

    if (parsedUrl.type !== SoundCloudResourceType.TRACK) {
      return;
    }

    const soundCloudService = await this.soundCloudService.connect({
      user: {
        provider: tokens.token.provider,
        userId: tokens.token.userId,
      },
      tokens: tokens.token,
    });

    if (parsedUrl.kind === SoundCloudUriType.URN) {
      const track = await soundCloudService.getTrack({ id: parsedUrl.id });
      const link = track.links[0];
      const parsedTrackUrl = SoundCloudURNParser.parse(link.providerUrl);

      return {
        type: MUSIC_SERVICE_PROVIDER_NAMES.SOUNDCLOUD,
        data: {
          id: parsedUrl.id,
          type: ParserMusicServiceURLType.TRACK,
          url:
            parsedTrackUrl.kind === SoundCloudUriType.URL
              ? parsedTrackUrl.url
              : link.providerUrl,
        },
      };
    }

    if (parsedUrl.kind === SoundCloudUriType.URL) {
      const entity = await soundCloudService.resolveUrl({
        url,
      });

      const parsedUrn = SoundCloudURNParser.parse(entity.urn);

      if (
        parsedUrn.kind === SoundCloudUriType.URN &&
        parsedUrn.type === SoundCloudResourceType.TRACK
      ) {
        return {
          type: MUSIC_SERVICE_PROVIDER_NAMES.SOUNDCLOUD,
          data: {
            id: parsedUrn.id,
            type: ParserMusicServiceURLType.TRACK,
            url: parsedUrl.url,
          },
        };
      }
    }
  }

  public async parseSong({
    url,
    tokens,
  }: ParseSongContext<ParserSoundcloudURL>): Promise<ITrack> {
    const soundCloudService = await this.soundCloudService.connect({
      user: {
        provider: tokens.token.provider,
        userId: tokens.token.userId,
      },
      tokens: tokens.token,
    });

    const track = await soundCloudService.getFullTrack({
      id: url.data.id,
    });

    const artists = track.artists as IArtist[];
    const album = track.album as IAlbum;

    if (track.links[0]) {
      const parsedUrl = SoundCloudURNParser.parse(track.links[0].providerUrl);

      if (parsedUrl && parsedUrl.kind === SoundCloudUriType.URL) {
        track.links[0].providerUrl = parsedUrl.url;
      }
    }

    return {
      ...track,
      artist: null,
      artists,
      album: {
        ...album,
        artists,
      },
    };
  }

  protected async getFinalSongFromSearch({
    tokens,
    track,
  }: GetFinalSongFromSearchContext): Promise<ITrack> {
    throw track;
  }

  protected async searchSongs({
    tokens,
    isrc,
    searchText,
  }: SearchSongContext): Promise<Maybe<ITrack[]>> {
    const soundcloudService = await this.soundCloudService.connect({
      user: {
        provider: tokens.token.provider,
        userId: tokens.token.userId,
      },
      tokens: tokens.token,
    });
    const spotifyResponse = await soundcloudService.searchTracks({
      search: searchText,
      options: {
        pagination: {
          limit: '50',
        },
      },
    });

    return spotifyResponse.tracks;
  }
}
