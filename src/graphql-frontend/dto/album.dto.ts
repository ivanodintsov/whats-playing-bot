import { Expose, Transform } from 'class-transformer';
import { fromUUID } from './utils';

export class AlbumResponseDTO {
  @Expose()
  @Transform(fromUUID)
  id: string;
}
