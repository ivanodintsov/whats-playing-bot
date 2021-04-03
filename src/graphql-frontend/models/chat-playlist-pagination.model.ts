import { Field, ObjectType } from '@nestjs/graphql'
import { ChatPlaylist } from './chat-playlist.model';

@ObjectType()
export class Pagination {
  @Field({ nullable: true })
  cursor?: string;
}

@ObjectType()
export class ChatPlaylistPagination {
  @Field(type => [ChatPlaylist])
  data: ChatPlaylist[];

  @Field(type => Pagination)
  meta: Pagination;
}
