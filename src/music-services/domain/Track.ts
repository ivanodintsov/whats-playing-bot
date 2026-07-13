import { MUSIC_SERVICE_PROVIDERS } from 'src/constants';

export class TrackEntity {
  id: string;
  name: string;
  artists?: string;
  url: string;
  uri: string;
  thumb_url: string;
  thumb_width?: number;
  thumb_height?: number;
  provider: MUSIC_SERVICE_PROVIDERS | 'INTERNAL';

  constructor(obj: TrackEntity) {
    Object.assign(this, obj);
  }
}
