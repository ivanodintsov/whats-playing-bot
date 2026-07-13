import {
  InternalURI,
  MusicServiceURI,
  MusicServiceURIService,
  MusicServiceURIType,
} from './types';
import {
  INTERNAL_MUSIC_SERVICE_PROVIDER,
  MUSIC_SERVICE_PROVIDERS,
  MUSIC_SERVICE_PROVIDERS_BY_NAME,
} from 'src/constants';
import { InternalURIParser } from './internal-uri';
import {
  IExternalUrl,
  LINK_TYPE,
} from 'src/music-services/music-service-core/types';
import { SpotifyUriParser } from './spotify-uri';
import { SoundcloudUriParser } from './soundcloud-uri';

export class MusicServicesUriParserService {
  static parsers = {
    [InternalURIParser.type]: InternalURIParser,
    [SpotifyUriParser.type]: SpotifyUriParser,
    [SoundcloudUriParser.type]: SoundcloudUriParser,
  };

  static parseUri(uri: string): MusicServiceURIService {
    const parsersList = Object.values(this.parsers);
    for (let i = 0; i < parsersList.length; i++) {
      try {
        const parsed = parsersList[i].parseUri(uri);

        return parsed;
      } catch (error) {}
    }

    throw Error('URI Parse Error');
  }

  static createUri(
    link: IExternalUrl,
    type: MUSIC_SERVICE_PROVIDERS | INTERNAL_MUSIC_SERVICE_PROVIDER,
  ) {
    const parser = this.parsers[type];

    if (!parser) {
      throw Error('URI Create Error');
    }

    return parser.fromLink(link);
  }

  static uriToString(uri: MusicServiceURI | InternalURI): string {
    const parser = this.parsers[uri.type];

    if (!parser) {
      throw Error('URI Create Error');
    }

    return parser.toString(uri);
  }

  static linkToUri(link: IExternalUrl): MusicServiceURI {
    if (link.type === LINK_TYPE.TRACK) {
      return {
        type: MUSIC_SERVICE_PROVIDERS_BY_NAME[link.provider],
        uri: {
          id: link.providerId,
          type: MusicServiceURIType.TRACK,
        },
      };
    }

    throw Error('URI Parse Error');
  }
}
