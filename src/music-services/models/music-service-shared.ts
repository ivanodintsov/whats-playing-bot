import { Model } from 'sequelize-typescript';
import { MUSIC_SERVICE_PROVIDERS } from 'src/constants';

export interface MusicServiceTokenShared {
  id: string;
  service: MUSIC_SERVICE_PROVIDERS;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_date: number;
  scope: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type MusicServiceTokenSharedModel = Model & MusicServiceTokenShared;
