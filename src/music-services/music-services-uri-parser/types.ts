import { MUSIC_SERVICE_PROVIDES } from 'src/constants';

export type MusicServiceURIData = {
  id: string;
  type?: 'track';
};

export type SpotifyURI = {
  type: MUSIC_SERVICE_PROVIDES.SPOTIFY;
  uri: MusicServiceURIData;
};

// export type YouTubeURL = {
//   type: 'youtube';
//   uri: MusicServiceURI;
// };

// export type TidalURL = {
//   type: 'tidal';
//   uri: MusicServiceURI;
// };

export type MusicServiceURI = SpotifyURI;
