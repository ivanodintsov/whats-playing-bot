import { ArgsType, Field, InputType, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

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

@InputType()
export class SoundCloudPagination {
  @Field({ nullable: true })
  offset?: number = 0;

  @Field({ nullable: true })
  next?: string;
}

@InputType()
export class SoundCloudSearchInput {
  @Field()
  search!: string;

  @Field(() => SoundCloudPagination, { nullable: true })
  pagination?: SoundCloudPagination;
}
