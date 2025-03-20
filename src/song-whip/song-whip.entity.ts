import { Maybe } from 'src/typings';

export type Link = {
  link: string;
  countries: string[];
  providerId: Maybe<string>;
};

export type SongWhipLinks = Record<string, Link[]>;
export type SongWhipServiceIds = Record<string, string>;

class SongWhipArtist {
  description: string;
  links: SongWhipLinks;
  serviceIds: SongWhipServiceIds;
  sourceUrl: string;
}

export class SongWhip {
  type: string;
  id: string;
  path: string;
  name: string;
  url: string;
  sourceUrl: string;
  sourceCountry: string;
  releaseDate: Maybe<string>;
  createdAt: Maybe<string>;
  updatedAt: Maybe<string>;
  refreshedAt: Maybe<string>;
  image: string;
  config: string;
  linksCountries: Maybe<string[]>;
  artists: Maybe<SongWhipArtist[]>;
  links: SongWhipLinks;
  isrc: Maybe<string>;
}
