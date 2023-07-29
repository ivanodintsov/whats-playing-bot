import { Expose, Transform } from 'class-transformer';
import { ArtistDomain } from 'src/songs-info/types/parser';
import { fromUUID } from './utils';

export class ArtistResponseDTO extends ArtistDomain {
  @Expose()
  @Transform(fromUUID)
  id: string;
}
