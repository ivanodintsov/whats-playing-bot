export type IDeezerAlbum = {
  id: string;
  title: string;
  link: string;
  cover: string;
  cover_small: string;
  cover_medium: string;
  cover_big: string;
  cover_xl: string;
  md5_image: string;
  release_date: string;
  tracklist: string;
  type: 'album';
};

export type IDeezerArtist = {
  id: string;
  name: string;
  link: string;
  share: string;
  picture: string;
  picture_small: string;
  picture_medium: string;
  picture_big: string;
  picture_xl: string;
  radio: boolean;
  tracklist: string;
  type: 'artist';
};

export type IDeezerTrack = {
  id: string;
  readable: boolean;
  title: string;
  title_short: string;
  title_version: string;
  isrc: string;
  link: string;
  share: string;
  duration: string;
  track_position: number;
  disk_number: number;
  rank: string;
  release_date: string;
  explicit_lyrics: boolean;
  explicit_content_lyrics: number;
  explicit_content_cover: number;
  preview: string;
  bpm: number;
  gain: number;
  available_countries: string[];
  contributors: IDeezerArtist[];
  md5_image: string;
  artist: IDeezerArtist;
  album: IDeezerAlbum;
  type: 'track';
};
