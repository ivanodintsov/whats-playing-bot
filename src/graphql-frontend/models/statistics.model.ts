import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class StatisticsEntity {
  @Field()
  sharedCount: number;

  @Field()
  likedCount: number;
}
