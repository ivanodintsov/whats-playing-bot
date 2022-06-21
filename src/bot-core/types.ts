import { TrackEntity } from 'src/domain/Track';
import { SongWhip } from 'src/schemas/song-whip.schema';

export type ShareSongData = {
  track: TrackEntity;
  songWhip?: SongWhip;
};

export type ShareSongConfig = {
  control?: boolean;
  anonymous?: boolean;
  loading?: boolean;
  donate?: boolean;
};
