import { MUSIC_SERVICE_PROVIDERS } from 'src/constants';

export abstract class ExpiredMusicServiceTokenError extends Error {
  name = ExpiredMusicServiceTokenError.name;

  abstract service: MUSIC_SERVICE_PROVIDERS;

  constructor() {
    super();
  }
}
