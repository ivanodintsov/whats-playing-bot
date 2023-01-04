type Link = {
  link: string;
  countries: string[];
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
  id: number;
  path: string;
  name: string;
  url: string;
  sourceUrl: string;
  sourceCountry: string;
  releaseDate: string;
  createdAt: string;
  updatedAt: string;
  refreshedAt: string;
  image: string;
  config: string;
  linksCountries: string[];
  artists: SongWhipArtist[];
  links: SongWhipLinks;
  isrc: string;
}
