import {
  MusicServiceURI,
  MusicServiceURIBase,
  MusicServiceURIData,
  MusicServiceURIService,
  MusicServiceURIType,
} from './types';
import {
  MUSIC_SERVICE_PROVIDER_NAMES,
  MUSIC_SERVICE_PROVIDERS,
} from 'src/constants';
import {
  SoundCloudResourceType,
  SoundCloudUriType,
  SoundCloudURNParser,
} from 'src/songs-info/soundcloud-parser/soundcloud-urn-parser';

export class SoundcloudUriParser extends MusicServiceURIService {
  static override type: MusicServiceURI['type'] =
    MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD;
  static override serviceName = MUSIC_SERVICE_PROVIDER_NAMES.SOUNDCLOUD;

  createUrl(): string {
    if (!this.uri.uri.type) {
      return null;
    }

    let type: string | null = null;

    if (this.uri.uri.type === 'track') {
      type = 'tracks';
    }

    if (type) {
      return `https://api.soundcloud.com/${type}/${this.uri.uri.id}`;
    }

    return null;
  }

  parseUri(uri: string): MusicServiceURIBase<any> {
    const parsed = SoundCloudURNParser.parse(uri);

    console.log(parsed, uri);

    if (
      parsed.kind === SoundCloudUriType.URN &&
      parsed.type === SoundCloudResourceType.TRACK
    ) {
      const data: Omit<MusicServiceURIData, 'url'> = {
        id: parsed.id,
        type: MusicServiceURIType.TRACK,
      };

      const parsedUri: MusicServiceURIBase<any> = {
        type: MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD,
        uri: data,
      };

      this.uri = parsedUri;
      this.uri.uri.url = this.createUrl();

      return parsedUri;
    }

    this.uri = null;

    throw Error('URI Parse Error');
  }

  toString(): string {
    const types: Record<MusicServiceURIType, string> = {
      [MusicServiceURIType.TRACK]: 'tracks',
    };
    const type = types[this.uri.uri.type];

    if (!type) {
      throw Error('URI Create Error');
    }

    return `${SoundcloudUriParser.serviceName}:${type}:${this.uri.uri.id}`;
  }
}
