import { Field, ObjectType } from '@nestjs/graphql';
import { TrackEntity } from './track.model';

@ObjectType()
export class PlaylistEntity {
  @Field()
  id: string;

  @Field(type => TrackEntity, { nullable: true })
  track?: TrackEntity;
}
