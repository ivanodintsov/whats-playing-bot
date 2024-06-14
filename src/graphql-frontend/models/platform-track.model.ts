import { Field, ObjectType } from '@nestjs/graphql';
import { StatisticsEntity } from './statistics.model';

import { TrackEntity } from './track.model';

@ObjectType()
export class PlatformLinks {
  @Field({ nullable: true })
  ios: string;

  @Field({ nullable: true })
  android: string;

  @Field({ nullable: true })
  desktop: string;

  @Field({ nullable: true })
  web: string;
}


@ObjectType()
export class PlatformTrackEntityResponse {
  @Field(type => TrackEntity)
  data: TrackEntity;

  @Field(type => PlatformLinks)
  links: PlatformLinks

  // @Field(type => StatisticsEntity, { nullable: true })
  // statistics: StatisticsEntity;
}
