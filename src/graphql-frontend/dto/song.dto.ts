import { ArgsType, Field } from '@nestjs/graphql';
import { Expose, Transform, Type } from 'class-transformer';
import { Link } from 'src/songs-info/models/link.model';
import { TrackDomainDbDTO } from 'src/songs-info/types/parser';
import { AlbumResponseDTO } from './album.dto';
import { ArtistResponseDTO } from './artist.dto';
import { fromUUID, toUUID } from './utils';

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

@ArgsType()
export class GetSongArgs {
  @Field({ nullable: false })
  @Transform(toUUID)
  songId: string;
}

@ArgsType()
export class GetSongByURIArgs {
  @Field({ nullable: false })
  songURI: string;
}

@ArgsType()
export class GetSongByURLArgs {
  @Field({ nullable: false })
  url: string;
}

@ArgsType()
export class GetPlatformTrackArgs {
  @Field({ nullable: false })
  @Transform(toUUID)
  songId: string;

  @Field({ nullable: false })
  platform: string;
}
