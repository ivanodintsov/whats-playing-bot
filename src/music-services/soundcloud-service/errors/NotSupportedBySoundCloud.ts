import { MUSIC_SERVICE_PROVIDERS } from 'src/constants';
import { NotSupportedByService } from 'src/music-services/music-service-core/errors/NotSupportedByService';

export class NotSupportedBySoundCloud extends NotSupportedByService {
  serviceName = MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD;
}
