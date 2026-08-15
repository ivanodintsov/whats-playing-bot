import {
  ArgsType,
  Field,
  InputType,
  IntersectionType,
  ObjectType,
} from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class SoundCloudPagination {
  @Field({ nullable: true })
  offset?: number = 0;

  @Field({ nullable: true })
  next?: string;
}

@InputType()
export class SoundCloudPaginationInput {
  @Field(() => SoundCloudPagination, { nullable: true })
  pagination?: SoundCloudPagination;
}

@ObjectType()
export class SoundCloudSearchTracksResponse {
  @Field(() => GraphQLJSON, { nullable: false })
  raw!: any;
}

@ObjectType()
export class SoundCloudSearchPlaylistsResponse {
  @Field(() => GraphQLJSON, { nullable: false })
  raw!: any;
}

@ObjectType()
export class SoundCloudSearchUsersResponse {
  @Field(() => GraphQLJSON, { nullable: false })
  raw!: any;
}

@ObjectType()
export class SoundCloudPlaylistResponse {
  @Field(() => GraphQLJSON, { nullable: false })
  raw!: any;
}

@ObjectType()
export class SoundCloudPlaylistItemsResponse {
  @Field(() => GraphQLJSON, { nullable: false })
  raw!: any;
}

@InputType()
export class SoundCloudSearchInput extends SoundCloudPaginationInput {
  @Field()
  search!: string;
}

@InputType()
export class SoundCloudGetPlaylistInput {
  @Field()
  playlistId!: string;
}

@InputType()
export class SoundCloudGetPlaylistItemsInput extends IntersectionType(
  SoundCloudGetPlaylistInput,
  SoundCloudPaginationInput,
) {}
