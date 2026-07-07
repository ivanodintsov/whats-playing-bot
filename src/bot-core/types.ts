import { TrackEntity } from 'src/music-services/domain/Track';
import {
  CreateConnectUrlOptions,
  MusicServiceContextOptions,
} from 'src/music-services/music-service-core/types';
import { ITrack } from 'src/songs-info/types/parser';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';
import { Message } from './message/message';
import { CLIENT_UNIQUE_PROVIDES, MUSIC_SERVICE_PROVIDES } from 'src/constants';

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

export type MusicServiceData = {
  type: MUSIC_SERVICE_PROVIDES;
};

export type TelegramCreateConnectUrlOptions = CreateConnectUrlOptions<{
  platform: CLIENT_UNIQUE_PROVIDES.TELEGRAM;
  id: TelegramUser['tg_id'];
  chatId: Message['chat']['id'];
}>;
