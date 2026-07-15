import {
  INTERNAL_MUSIC_SERVICE_NAME,
  INTERNAL_MUSIC_SERVICE_PROVIDER,
  MUSIC_SERVICE_PROVIDER_NAMES,
  MUSIC_SERVICE_PROVIDERS,
} from 'src/constants';
import { Link } from 'src/songs-info/models/link.model';
import {
  IExternalUrl,
  LINK_TYPE,
} from 'src/music-services/music-service-core/types';

export enum MusicServiceURIType {
  TRACK = 'track',
}

export type MusicServiceURIData = {
  id: string;
  url?: string;
  type?: MusicServiceURIType;
};

export type MusicServiceURIBase<T> = {
  type: T;
  uri: MusicServiceURIData;
};

export type SpotifyURI = MusicServiceURIBase<MUSIC_SERVICE_PROVIDERS.SPOTIFY>;
export type SoundcloudURI =
  MusicServiceURIBase<MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD>;
export type InternalURI = MusicServiceURIBase<INTERNAL_MUSIC_SERVICE_PROVIDER>;

export type MusicServiceURI = SpotifyURI | SoundcloudURI;

export class MusicServiceURIService {
  static type: (MusicServiceURI | InternalURI)['type'];
  static serviceName:
    | MUSIC_SERVICE_PROVIDER_NAMES
    | INTERNAL_MUSIC_SERVICE_NAME;
  protected _uri: MusicServiceURIBase<any>;

  get uri() {
    return this._uri;
  }

  set uri(uri: MusicServiceURIBase<any>) {
    this._uri = uri;
  }

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
      id: link.providerId,
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
    throw new Error('Method not implemented.');
  }
  static createUrl(uri: MusicServiceURIBase<any>): string {
    const instance = new this();
    instance.uri = uri;
    return instance.createUrl();
  }

  toString(): string {
    return `${
      (this.constructor as unknown as typeof MusicServiceURIService).serviceName
    }:${this.uri.uri.type}:${this.uri.uri.id}`;
  }
  static toString(uri: MusicServiceURIBase<any>): string {
    const instance = new this();
    instance.uri = uri;
    return instance.toString();
  }

  parseUri(uri: string): MusicServiceURIBase<any> {
    const regexp = new RegExp(
      `(?<serviceName>.*):(?<entityName>.*):(?<entityId>.*)$`,
    );
    const match = uri?.match(regexp);

    if (
      match.groups.serviceName !==
        (this.constructor as unknown as typeof MusicServiceURIService)
          .serviceName ||
      !match.groups.entityId ||
      !match.groups.entityName
    ) {
      throw Error('URI Parse Error');
    }

    const data: Omit<MusicServiceURIData, 'url'> = {
      id: match.groups.entityId,
      type: match.groups
        .entityName as unknown as MusicServiceURIBase<any>['uri']['type'],
    };

    const parsedUri: MusicServiceURIBase<any> = {
      type: (this.constructor as unknown as typeof MusicServiceURIService).type,
      uri: data,
    };

    this.uri = parsedUri;

    parsedUri.uri.url = this.createUrl();

    return this.uri;
  }

  static parseUri(uri: string): MusicServiceURIService {
    const instance = new this();
    instance.parseUri(uri);
    return instance;
  }
}
