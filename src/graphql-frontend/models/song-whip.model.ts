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
  @Field({ nullable: true })
  path?: string;

  @Field(type => [SongWhipLink], { nullable: true })
  links?: SongWhipLink[];
}
