import { IAlbum, ITrack, ParsedURL, ServiceURL } from '../types/parser';

export type Provider =
  | 'spotify'
  | 'itunes'
  | 'itunesStore'
  | 'youtubeMusic'
  | 'youtube';

export const SERVICES_PROVIDERS: Record<Provider, Provider> = {
  spotify: 'spotify',
  itunes: 'itunes',
  itunesStore: 'itunesStore',
  youtube: 'youtube',
  youtubeMusic: 'youtubeMusic',
};

export abstract class ParserService {
  public abstract parseUrl(url: string): ParsedURL;
  public abstract parseSong(url: ParsedURL): Promise<ITrack>;
  public abstract updateSong(song: ITrack): Promise<ITrack>;
  protected abstract readonly _type: string;

  get type() {
    return this._type;
  }

  public normalizeUrl(url: string): string | undefined {
    return;
  }

  async getArtistAlbumsIds(
    artistId: string,
    data: any | null,
  ): Promise<{
    ids: any[];
    hasMore?: boolean;
    data?: any;
  }> {
    return;
  }

  async getAlbum(
    albumId: string,
  ): Promise<{
    album: IAlbum;
    rawAlbum: any;
  }> {
    return;
  }

  async getAlbumTracksIds(
    albumId: string,
    data: any | null,
  ): Promise<{
    ids: any[];
    hasMore?: boolean;
    data?: any;
  }> {
    return;
  }

  public getTrack(
    id: string,
  ): Promise<{
    track: ITrack;
    rawTrack: any;
  }> {
    return;
  }
}
