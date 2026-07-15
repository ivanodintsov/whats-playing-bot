import { MUSIC_SERVICE_PROVIDERS } from 'src/constants';

export abstract class NotSupportedByService extends Error {
  abstract serviceName: MUSIC_SERVICE_PROVIDERS;

  name = NotSupportedByService.name;

  constructor() {
    super();
  }
}
