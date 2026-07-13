import { isValidUUID } from 'src/utils/isValidUUID';
import { IExternalUrl } from '../music-service-core/types';
import {
  InternalURI,
  MusicServiceURIData,
  MusicServiceURIService,
  MusicServiceURIType,
} from './types';
import { fromUUID, toUUID } from 'src/utils/shortUUID';
import {
  INTERNAL_MUSIC_SERVICE_NAME,
  INTERNAL_MUSIC_SERVICE_PROVIDER,
} from 'src/constants';
import { LINK_TYPE } from 'src/music-services/music-service-core/types';

export class InternalURIParser extends MusicServiceURIService {
  static override type: InternalURI['type'] = INTERNAL_MUSIC_SERVICE_PROVIDER;
  static override serviceName = INTERNAL_MUSIC_SERVICE_NAME;

  static fromLink(link: IExternalUrl): MusicServiceURIService {
    const typesMap = {
      [LINK_TYPE.ALBUM]: false,
      [LINK_TYPE.ARTIST]: false,
      [LINK_TYPE.TRACK]: MusicServiceURIType.TRACK,
    } as const;

    const type = typesMap[link.type];

    if (!type) {
      throw Error('URI Create Error');
    }

    const data: Omit<MusicServiceURIData, 'url'> = {
      id: fromUUID({ value: link.trackId }),
      type,
    };

    const instance = new this();

    instance.uri = {
      type: this.type,
      uri: data,
    };

    instance.uri.uri.url = instance.createUrl();

    return instance;
  }

  createUrl(): string {
    if (!this.uri || !this.uri.uri.type) {
      return null;
    }

    return `/${this.uri.uri.type}/${this.uri.uri.id}`;
  }

  parseUri(uri: string) {
    try {
      const parsedUri = super.parseUri(uri);

      const uuid = toUUID({ value: parsedUri.uri.id });
      const parsed = isValidUUID(uuid);

      if (!parsed) {
        throw Error('URI Parse Error');
      }

      this.uri = parsedUri;
      this.uri.uri.id = uuid;

      return this.uri;
    } catch (error) {
      throw Error('URI Parse Error');
    }
  }
}
