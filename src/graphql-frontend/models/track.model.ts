import { ArgsType, Field, InputType, ObjectType } from '@nestjs/graphql';
import { SongWhip } from './song-whip.model';
import { SongInfo } from './song-info.model';
import { StatisticsEntity } from './statistics.model';
import { ALBUM_TYPE } from 'src/music-services/music-service-core/types';
import UTCDate from '../scalar/UTCDate';
import { Expose, Transform } from 'class-transformer';
import { toUUID } from 'src/utils/shortUUID';

@ObjectType()
export class Link {
  @Field()
  url: string;

  @Field()
  provider: string;

  @Field({ nullable: true })
  providerId?: string;
}

@ObjectType()
class Image {
  @Field({ nullable: true })
  width: number;

  @Field({ nullable: true })
  height: number;

  @Field({ nullable: true })
  url: string;

  @Field(() => Image, { nullable: true })
  small: Image;

  @Field(() => Image, { nullable: true })
  medium: Image;

  @Field(() => Image, { nullable: true })
  alternative: Image;
}

@ObjectType()
class SongArtist {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field((type) => [Link], { nullable: true })
  links?: Link;
}

@ObjectType()
class Album {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field(() => Image, { nullable: true })
  image: Image;

  @Field(() => UTCDate, { nullable: true })
  releaseDate: any;

  @Field((type) => ALBUM_TYPE, { nullable: true })
  albumType: ALBUM_TYPE;

  @Field((type) => [Link], { nullable: true })
  links?: Link;
}

@ObjectType()
export class TrackEntity {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field((type) => [SongArtist], { nullable: true })
  artists?: SongArtist[];

  @Field((type) => SongArtist, { nullable: true })
  artist: SongArtist;

  @Field((type) => Album, { nullable: true })
  album: Album;

  @Field((type) => [Link], { nullable: true })
  links?: Link;

  @Field((type) => SongWhip, { nullable: true })
  songWhip?: SongWhip;

  @Field((type) => SongInfo, { nullable: true })
  info?: SongInfo;
}

@ObjectType()
export class TrackEntityResponse {
  @Field((type) => TrackEntity)
  data: TrackEntity;

  @Field((type) => StatisticsEntity, { nullable: true })
  statistics: StatisticsEntity;
}

@ObjectType()
export class TrackStatusResponse {
  @Field((type) => TRACK_STATUS)
  status: TRACK_STATUS;

  @Field({ nullable: true })
  id: string;
}

export enum TRACK_STATUS {
  processing,
  notFound,
  done,
}

@ArgsType()
export class GetSongArgs {
  @Field({ nullable: false })
  @Transform(toUUID)
  songId: string;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  @Expose('')
  @Transform(({ obj }) => obj)
  _raw: GetSongArgs;
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
  @Field({ nullable: true })
  @Transform(toUUID)
  songId: string;

  @Field({ nullable: true })
  oldId: string;

  @Field({ nullable: false })
  platform: string;
}

@ArgsType()
export class ShareTrackArgs {
  @Field({ nullable: false })
  url: string;
}

@ObjectType()
export class ShareDataDTO {
  @Field({ nullable: false })
  id: string;

  @Field({ nullable: false })
  expiration_date: number;
}

@ObjectType()
export class ShareTrackResponseDTO {
  @Field(() => ShareDataDTO, { nullable: true })
  data: ShareDataDTO;
}
