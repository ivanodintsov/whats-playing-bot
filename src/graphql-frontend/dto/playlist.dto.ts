import { Type } from 'class-transformer';
import { TrackDomainResponseDTO } from './song.dto';

export class PlaylistEntityResponseDTO {
  id: string;

  @Type(() => TrackDomainResponseDTO)
  track: TrackDomainResponseDTO;
}
