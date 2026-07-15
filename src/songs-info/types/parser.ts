import { MUSIC_SERVICE_PROVIDER_NAMES } from 'src/constants';

export const enum ParserMusicServiceURLType {
  TRACK = 'track',
}

type ParserMusicServiceURLData = {
  id: string;
  url: string;
  type?: ParserMusicServiceURLType;
};

type ParserMusicServiceURLBase<T> = {
  type: T;
  data: ParserMusicServiceURLData;
};

export type ParserSpotifyURL =
  ParserMusicServiceURLBase<MUSIC_SERVICE_PROVIDER_NAMES.SPOTIFY>;
export type ParserSoundcloudURL =
  ParserMusicServiceURLBase<MUSIC_SERVICE_PROVIDER_NAMES.SOUNDCLOUD>;

export type ParserMusicServiceURL = ParserSpotifyURL | ParserSoundcloudURL;
