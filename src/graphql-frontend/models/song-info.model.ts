import { Field, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class SongInfo {
  @Field()
  shareCount?: number;
}