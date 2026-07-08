import { TrackEntity } from 'src/music-services/domain/Track';
import {
  CreateConnectUrlOptions,
  MusicServiceContextOptions,
} from 'src/music-services/music-service-core/types';
import { ITrack } from 'src/songs-info/types/parser';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';
import { Message } from './message/message';
import {
  CLIENT_PROVIDES,
  CLIENT_UNIQUE_PROVIDES,
  MUSIC_SERVICE_PROVIDERS,
  TELEGRAM_CLIENT_PROVIDERS,
} from 'src/constants';

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
  type: MUSIC_SERVICE_PROVIDERS;
};

export type TelegramCreateConnectUrlOptions = CreateConnectUrlOptions<{
  platform: CLIENT_UNIQUE_PROVIDES.TELEGRAM;
  platformInstance: TELEGRAM_CLIENT_PROVIDERS;
  id: TelegramUser['tg_id'];
  chatId: Message['chat']['id'];
}>;
