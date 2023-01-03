import { ITrack, ParsedURL } from '../types/parser';

export abstract class ParserService {
  public abstract parseUrl(url: string): ParsedURL;
  public abstract parseSong(url: ParsedURL): Promise<ITrack>;
  public abstract updateSong(song: ITrack): Promise<ITrack>;
  protected abstract readonly _type: string;

  get type() {
    return this._type;
  }
}
