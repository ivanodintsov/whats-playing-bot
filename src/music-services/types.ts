import { CLIENT_UNIQUE_PROVIDES, MUSIC_SERVICE_PROVIDERS } from 'src/constants';
import { MusicServiceToken } from './models/music-service-token.model';

export type MusicServicesConnectContext = {
  userId: MusicServiceToken['userId'];
  provider: MusicServiceToken['provider'];
};

export type MusicServicesConnectedSuccessDataContext = {
  platform: CLIENT_UNIQUE_PROVIDES;
  service: MUSIC_SERVICE_PROVIDERS;
};
