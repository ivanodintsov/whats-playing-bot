import { Field, ObjectType } from '@nestjs/graphql';
import { SongWhip } from './song-whip.model';
import { SongInfo } from './song-info.model';

@ObjectType()
class SongArtist {
  @Field()
  name: string;
}

@ObjectType()
export class Link {
  @Field()
  url: string;

  @Field()
  provider: string;
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
class Album {
  @Field()
  name: string;

  @Field(() => Image, { nullable: true })
  image: Image;
}

@ObjectType()
export class TrackEntity {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field(type => [SongArtist], { nullable: true })
  artists?: SongArtist[];

  @Field(type => Album, { nullable: true })
  album: Album;

  @Field(type => [Link], { nullable: true })
  links?: Link;

  @Field(type => SongWhip, { nullable: true })
  songWhip?: SongWhip;

  @Field(type => SongInfo, { nullable: true })
  info?: SongInfo;
}
