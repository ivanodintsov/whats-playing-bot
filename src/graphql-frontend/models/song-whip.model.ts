import { Field, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class SongWhipLink {
  @Field()
  name: string;

  @Field()
  link: string;
}

@ObjectType()
export class SongWhip {
  @Field()
  path: string;

  @Field(type => [SongWhipLink])
  links: SongWhipLink[];
}