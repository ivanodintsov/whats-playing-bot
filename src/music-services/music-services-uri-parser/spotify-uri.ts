import * as spotifyUri from 'spotify-uri';
import {
  MusicServiceURI,
  MusicServiceURIBase,
  MusicServiceURIService,
  MusicServiceURIType,
} from './types';
import {
  MUSIC_SERVICE_PROVIDER_NAMES,
  MUSIC_SERVICE_PROVIDERS,
} from 'src/constants';

export class SpotifyUriParser extends MusicServiceURIService {
  static override type: MusicServiceURI['type'] =
    MUSIC_SERVICE_PROVIDERS.SPOTIFY;
  static override serviceName = MUSIC_SERVICE_PROVIDER_NAMES.SPOTIFY;

  protected createInstance() {
    return new SpotifyUriParser();
  }

  createUrl(): string {
    return spotifyUri.formatOpenURL(this.toString());
  }

  parseUri(uri: string): MusicServiceURIBase<any> {
    const parsed = spotifyUri.parse(uri);

    if (parsed.type === 'track') {
      const parsedUrl = parsed as spotifyUri.Track;

      const parsedUri = {
        type: MUSIC_SERVICE_PROVIDERS.SPOTIFY,
        uri: {
          id: parsedUrl.id,
          type: MusicServiceURIType.TRACK,
          url: parsedUrl.toURL(),
        },
      };

      this.uri = parsedUri;

      return parsedUri;
    }

    throw Error('URI Parse Error');
  }
}
