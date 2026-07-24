import { Expose, Transform } from 'class-transformer';
import { ArtistDomain } from 'src/music-services/music-service-core/dto';
import { fromUUID } from 'src/utils/shortUUID';

export class ArtistResponseDTO extends ArtistDomain {
  @Expose()
  @Transform(fromUUID)
  id: string;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  @Expose('')
  @Transform(({ obj }) => obj)
  _raw: ArtistDomain;
}
