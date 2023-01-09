import { Field, ObjectType } from '@nestjs/graphql';
import { TrackEntity } from './track.model';

@ObjectType()
export class Pagination {
  @Field({ nullable: true })
  cursor?: string;

  @Field({ nullable: true })
  previousCursor?: string;
}

@ObjectType()
export class TrackEntityPagination {
  @Field(type => [TrackEntity])
  data: TrackEntity[];

  @Field(type => Pagination)
  meta: Pagination;
}
