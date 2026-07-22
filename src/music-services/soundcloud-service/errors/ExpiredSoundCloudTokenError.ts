import { MUSIC_SERVICE_PROVIDERS } from 'src/constants';
import { ExpiredMusicServiceTokenError } from 'src/errors';

export class ExpiredSoundCloudTokenError extends ExpiredMusicServiceTokenError {
  service = MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD;
}
