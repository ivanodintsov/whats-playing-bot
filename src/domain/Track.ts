export class TrackEntity {
  id: string | number;
  name: string;
  artists: string;
  album: string;
  url: string;
  thumb_url: string;
  thumb_width?: number;
  thumb_height?: number;
  year?: number;
  isrc: string;

  constructor(obj: TrackEntity) {
    Object.assign(this, obj);
  }
}
