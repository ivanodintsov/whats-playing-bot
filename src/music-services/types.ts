import { MusicServiceToken } from './models/music-service-token.model';

export type MusicServicesConnectContext = {
  userId: MusicServiceToken['userId'];
  provider: MusicServiceToken['provider'];
};
