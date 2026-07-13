import { Expose, Transform } from 'class-transformer';
import { fromUUID } from 'src/utils/shortUUID';

export class AlbumResponseDTO {
  @Expose()
  @Transform(fromUUID)
  id: string;
}
