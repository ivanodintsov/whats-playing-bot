import { TrackEntity } from 'src/spotify/domain/Track';
import { ITrack } from 'src/songs-info/types/parser';

export type ShareSongData = {
  track: TrackEntity;
  trackInfo?: ITrack;
};

export type ShareSongConfig = {
  control?: boolean;
  anonymous?: boolean;
  loading?: boolean;
  share?: boolean;
  serviceChat?: boolean;
  donate?: boolean;
};
