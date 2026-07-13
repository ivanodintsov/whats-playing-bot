import { Artist } from 'src/songs-info/models/artist.model';
import { Maybe } from 'src/typings';
import { Expose, Transform } from 'class-transformer';
import {
  ALBUM_TYPE,
  ArtistSocialDomain,
  IAlbum,
  IArtist,
  IExternalUrls,
  IGenre,
  IImage,
  ITrack,
  SONG_TYPE,
} from '../types';

export class TrackDomain implements ITrack {
  id?: string;
  oldId?: string;
  name: string;
  type: SONG_TYPE;
  trackNumber: Maybe<number>;
  links: IExternalUrls;
  isrc: Maybe<string[]>;
  upc: Maybe<string[]>;
  ean: Maybe<string[]>;
  explicit: boolean;
  duration: Maybe<number>;

  album: IAlbum;
  artists: IArtist[];
  artist?: IArtist;
}

export class TrackDomainDbDTO extends TrackDomain {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  @Expose('')
  @Transform(({ obj }) => {
    const artists = obj.artists as Artist[];

    if (!artists) {
      return null;
    }

    if (!Array.isArray(artists)) {
      return artists as Artist;
    }

    return artists.find((artist) => artist.TrackArtist?.feat);
  })
  artist: IArtist;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  @Expose('')
  @Transform(({ obj }) => {
    const artists = obj.artists as Artist[];

    if (!Array.isArray(artists)) {
      return [artists as Artist];
    }

    return artists;
  })
  artists: IArtist[];
}

export class ArtistDomain {
  id?: string;
  genres: Maybe<IGenre[]>;
  name: string;
  image: Maybe<IImage>;
  links: Maybe<IExternalUrls>;
  socials?: Maybe<ArtistSocialDomain[]>;
}

export class AlbumDomain implements IAlbum {
  id?: string;
  name: string;
  albumType: Maybe<ALBUM_TYPE>;
  availableMarkets: Maybe<string[]>;
  totalTracks: Maybe<number>;
  links: Maybe<IExternalUrls>;
  image: Maybe<IImage>;
  releaseDate: Maybe<Date>;
  artists: IArtist[];
  isrc: Maybe<string[]>;
  upc: Maybe<string[]>;
  ean: Maybe<string[]>;
}
