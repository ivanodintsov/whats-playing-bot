import { ISong, ParsedURL } from '../types/parser';

export abstract class ParserService {
  public abstract parseUrl(url: string): ParsedURL;
  public abstract parseSong(url: ParsedURL): Promise<ISong>;
  public abstract updateSong(song: ISong): Promise<ISong>;
  protected abstract readonly _type: string;

  get type() {
    return this._type;
  }
}
