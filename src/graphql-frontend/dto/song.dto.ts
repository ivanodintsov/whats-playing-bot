import { Expose, Transform, Type } from 'class-transformer';
import { Link } from 'src/songs-info/models/link.model';
import { TrackDomainDbDTO } from 'src/songs-info/types/parser';
import { AlbumResponseDTO } from './album.dto';
import { ArtistResponseDTO } from './artist.dto';
import { fromUUID } from './utils';

export class TrackDomainResponseDTO {
  @Expose()
  @Transform(fromUUID)
  id: string;

  @Expose()
  @Type(() => ArtistResponseDTO)
  artists: ArtistResponseDTO[];

  @Expose()
  @Type(() => ArtistResponseDTO)
  artist: ArtistResponseDTO;

  @Expose()
  @Type(() => AlbumResponseDTO)
  album: AlbumResponseDTO;

  links: Link[];

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  @Expose('')
  @Transform(({ obj }) => obj)
  _raw: TrackDomainDbDTO;
}
