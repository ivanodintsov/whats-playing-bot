import { MUSIC_SERVICE_PROVIDERS } from 'src/constants';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';
import { Maybe } from 'src/typings';
import { PlaybackQueue } from './internal-music-playback-queue.model';

export type PlayerTrackLink = {
  providerId: string;
  type: string;
  url: string;
};

export type FindPlaybackQueueOptions = {
  service: MUSIC_SERVICE_PROVIDERS;
  providerUserId: TelegramUser['id'];
};

type QueuePlaybackAlbum = {
  id: string;
  uri: string;
  name: string;
  url: Maybe<string>;
  image: Maybe<{
    height: Maybe<number>;
    size: Maybe<string>;
    url: string;
    width: Maybe<number>;
  }>;
};

type QueuePlaybackArtist = {
  id: string;
  uri: string;
  url: Maybe<string>;
  name: string;
};

export interface PlaybackTrack {
  id: Maybe<string>;
  uri: string;
  type: string;
  media_type: Maybe<'audio' | 'video'>;
  name: string;
  is_playable: Maybe<boolean>;
  duration_ms: number;
  album: Maybe<QueuePlaybackAlbum>;
  artists: Maybe<QueuePlaybackArtist[]>;
  url: PlayerTrackLink;
}

export interface PlaybackQueueData {
  id: string;
  service: MUSIC_SERVICE_PROVIDERS;
  providerUserId: TelegramUser['id'];
  currentIndex: number;
  queueList: PlaybackTrack[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type AddedToQueueReturnType = {
  id: PlaybackQueueData['id'];
  currentIndex: PlaybackQueueData['currentIndex'];
  length: number;
  removedTracks: number;
};

export type GetQueueReturnType = PlaybackQueue;

export type NoSkipedTracksReturnType = {
  id: Maybe<PlaybackQueueData['id']>;
  currentIndex: -1;
  track: null;
  isFinished: true;
  removedTracks: 0;
  queueLength: number;
};

export type SkipedTracksReturnType = {
  id: PlaybackQueueData['id'];
  currentIndex: -1;
  track: PlaybackTrack;
  isFinished: false;
  removedTracks: number;
  queueLength: number;
};

export type SkipQueueToIndexReturnType =
  | NoSkipedTracksReturnType
  | SkipedTracksReturnType;

export type NoTrackToRemoveReturnType = {
  id: Maybe<PlaybackQueueData['id']>;
  currentIndex: -1;
  isFinished: true;
  removedTrack: 0;
  queueLength: number;
};

export type RemoveTrackReturnType = {
  id: PlaybackQueueData['id'];
  currentIndex: -1;
  isFinished: boolean;
  removedTrack: number;
  queueLength: number;
};

export type RemoveByIndexReturnType =
  | NoTrackToRemoveReturnType
  | RemoveTrackReturnType;
