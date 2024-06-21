export class TrackEntity {
  id: string;
  name: string;
  artists: string;
  url: string;
  thumb_url: string;
  thumb_width?: number;
  thumb_height?: number;

  constructor(obj: TrackEntity) {
    Object.assign(this, obj);
  }
}
