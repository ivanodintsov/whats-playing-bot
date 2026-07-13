export enum SoundCloudResourceType {
  TRACK = 'track',
  PLAYLIST = 'playlist',
  USER = 'user',
}

export enum SoundCloudUriType {
  URN,
  URL,
}

export type SoundCloudUri =
  | {
      kind: SoundCloudUriType.URN;
      type: SoundCloudResourceType.TRACK;
      urn: string;
      id: string;
    }
  | {
      kind: SoundCloudUriType.URL;
      type: SoundCloudResourceType.TRACK;
      url: string;
      username: string;
      slug: string;
    }
  | {
      kind: SoundCloudUriType.URN;
      type: SoundCloudResourceType.PLAYLIST;
      urn: string;
      id: string;
    }
  | {
      kind: SoundCloudUriType.URL;
      type: SoundCloudResourceType.PLAYLIST;
      url: string;
      username: string;
      slug: string;
    }
  | {
      kind: SoundCloudUriType.URN;
      type: SoundCloudResourceType.USER;
      urn: string;
      id: string;
    }
  | {
      kind: SoundCloudUriType.URL;
      type: SoundCloudResourceType.USER;
      url: string;
      username: string;
    };

export class SoundCloudURNParser {
  private static readonly URL_RE =
    /^https?:\/\/(?:www\.|m\.)?soundcloud\.com\/([^/?#]+)(?:\/([^?#]+))?(?:\/([^?#]+))?/i;
  private static readonly URN_RE =
    /^soundcloud:(tracks|playlists|users):([a-zA-Z0-9_-]+)$/i;

  static parse(input: string): SoundCloudUri | null {
    input = input.trim();

    const urn = this.normalizeUrn(input);
    if (urn) {
      const [, resource, id] = urn.match(this.URN_RE)!;

      return {
        kind: SoundCloudUriType.URN,
        type: this.resourceToType(resource),
        urn,
        id,
      } as SoundCloudUri;
    }

    const url = this.normalizeUrl(input);
    if (url) {
      const [, username, second, third] = url.match(this.URL_RE)!;

      if (!second) {
        return {
          kind: SoundCloudUriType.URL,
          type: SoundCloudResourceType.USER,
          url,
          username,
        };
      }

      if (second === 'sets' && third) {
        return {
          kind: SoundCloudUriType.URL,
          type: SoundCloudResourceType.PLAYLIST,
          url,
          username,
          slug: third,
        };
      }

      return {
        kind: SoundCloudUriType.URL,
        type: SoundCloudResourceType.TRACK,
        url,
        username,
        slug: second,
      };
    }

    return null;
  }

  static normalizeUrl(input: string): string | null {
    let url: URL;

    try {
      url = new URL(input);
    } catch {
      return null;
    }

    if (!/^(www\.|m\.)?soundcloud\.com$/i.test(url.hostname)) {
      return null;
    }

    url.protocol = 'https:';
    url.hostname = 'soundcloud.com';
    url.search = '';
    url.hash = '';

    url.pathname = url.pathname.replace(/\/+/g, '/').replace(/\/$/, '');

    return url.toString();
  }

  static normalizeUrn(input: string): string | null {
    const match = input.match(this.URN_RE);

    if (!match) {
      return null;
    }

    return `soundcloud:${match[1].toLowerCase()}:${match[2]}`;
  }

  static isUrl(input: string): boolean {
    return this.normalizeUrl(input) !== null;
  }

  static isUrn(input: string): boolean {
    return this.normalizeUrn(input) !== null;
  }

  private static resourceToType(resource: string): SoundCloudResourceType {
    switch (resource.toLowerCase()) {
      case 'tracks':
        return SoundCloudResourceType.TRACK;
      case 'playlists':
        return SoundCloudResourceType.PLAYLIST;
      case 'users':
        return SoundCloudResourceType.USER;
      default:
        throw new Error(`Unknown resource: ${resource}`);
    }
  }
}
