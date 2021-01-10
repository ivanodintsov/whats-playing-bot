import { Field, Int, ObjectType } from '@nestjs/graphql'
import { SongWhip } from './song-whip.model';
import { SongInfo } from './song-info.model';

@ObjectType()
export class ChatPlaylist {
  @Field()
  _id: string;

  @Field()
  name: string;

  @Field()
  artists?: string;

  @Field({ nullable: true })
  image?: string;

  @Field(type => SongWhip, { nullable: true })
  songWhip?: SongWhip;

  @Field(type => SongInfo, { nullable: true })
  info?: SongInfo;
}