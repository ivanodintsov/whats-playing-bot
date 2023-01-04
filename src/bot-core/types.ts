import { TrackEntity } from 'src/domain/Track';
import { ITrack } from 'src/songs-info/types/parser';

export type ShareSongData = {
  track: TrackEntity;
  trackInfo?: ITrack;
};

export type ShareSongConfig = {
  control?: boolean;
  anonymous?: boolean;
  loading?: boolean;
  donate?: boolean;
};
