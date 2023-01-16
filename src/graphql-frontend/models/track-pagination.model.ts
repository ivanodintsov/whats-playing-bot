import { Field, ObjectType } from '@nestjs/graphql';
import { PlaylistEntity } from './playlist-item.model';

@ObjectType()
export class Pagination {
  @Field({ nullable: true })
  cursor?: string;

  @Field({ nullable: true })
  previousCursor?: string;
}

@ObjectType()
export class TrackEntityPagination {
  @Field(type => [PlaylistEntity])
  data: PlaylistEntity[];

  @Field(type => Pagination)
  meta: Pagination;
}
