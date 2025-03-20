import { createUnionType, Field, ObjectType } from '@nestjs/graphql';
import { SongWhip } from './song-whip.model';
import { SongInfo } from './song-info.model';
import { StatisticsEntity } from './statistics.model';
import { ALBUM_TYPE } from 'src/songs-info/types/parser';
import UTCDate from '../scalar/UTCDate';

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

  @Field(type => [Link], { nullable: true })
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

  @Field(() => UTCDate)
  releaseDate: any;

  @Field(type => ALBUM_TYPE)
  albumType: ALBUM_TYPE;

  @Field(type => [Link], { nullable: true })
  links?: Link;
}

@ObjectType()
export class TrackEntity {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field(type => [SongArtist], { nullable: true })
  artists?: SongArtist[];

  @Field(type => SongArtist, { nullable: true })
  artist: SongArtist;

  @Field(type => Album, { nullable: true })
  album: Album;

  @Field(type => [Link], { nullable: true })
  links?: Link;

  @Field(type => SongWhip, { nullable: true })
  songWhip?: SongWhip;

  @Field(type => SongInfo, { nullable: true })
  info?: SongInfo;
}

@ObjectType()
export class TrackEntityResponse {
  @Field(type => TrackEntity)
  data: TrackEntity;

  @Field(type => StatisticsEntity, { nullable: true })
  statistics: StatisticsEntity;
}

@ObjectType()
export class TrackStatusResponse {
  @Field(type => TRACK_STATUS)
  status: TRACK_STATUS;

  @Field({ nullable: true })
  id: string;
}

export enum TRACK_STATUS {
  processing,
  notFound,
  done,
}
