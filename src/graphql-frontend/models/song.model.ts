import { Field, Int, ObjectType } from '@nestjs/graphql';
import { SongWhipLink } from './song-whip.model';

@ObjectType()
export class Artist {
  @Field()
  type: string;

  @Field()
  name: string;
}

@ObjectType()
export class Song {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  image?: string;

  @Field(type => [Artist], { nullable: true })
  artists?: Artist[];

  @Field({ nullable: true })
  path?: string;

  @Field(type => [SongWhipLink], { nullable: true })
  links?: SongWhipLink[];

  @Field({ nullable: true })
  lyrics?: string;
}
