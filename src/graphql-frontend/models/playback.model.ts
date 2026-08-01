import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';
import { MUSIC_SERVICE_PROVIDERS } from 'src/constants';

@InputType()
export class PlaybackImageInput {
  @Field({ nullable: true })
  height!: number;

  @Field({ nullable: true })
  size!: string;

  @Field()
  url!: string;

  @Field({ nullable: true })
  width!: number;
}

@InputType()
export class PlaybackTrackAlbumInput {
  @Field({ nullable: true })
  id!: string;

  @Field({ nullable: true })
  uri!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  url!: string;

  @Field(() => PlaybackImageInput)
  image!: PlaybackImageInput;
}

@InputType()
export class PlaybackTrackArtistInput {
  @Field({ nullable: true })
  id!: string;

  @Field({ nullable: true })
  uri!: string;

  @Field({ nullable: true })
  url!: string;

  @Field()
  name!: string;
}

@InputType()
export class PlaybackTrackLinkInput {
  @Field()
  providerId: string;

  @Field()
  type: string;

  @Field()
  url: string;
}

@InputType()
export class QueuePlaybackTrackInput {
  @Field({ nullable: true })
  id!: string;

  @Field()
  uri!: string;

  @Field()
  type!: string;

  @Field({ nullable: true })
  media_type!: 'audio' | 'video';

  @Field()
  name!: string;

  @Field({ nullable: true })
  is_playable: boolean;

  @Field()
  duration_ms: number;

  @Field(() => PlaybackTrackAlbumInput, { nullable: true })
  album!: PlaybackTrackAlbumInput;

  @Field(() => [PlaybackTrackArtistInput], { nullable: true })
  artists!: PlaybackTrackArtistInput[];

  @Field(() => PlaybackTrackLinkInput)
  url!: PlaybackTrackLinkInput;
}

@InputType()
export class AddToPlaybackQueueInput {
  @Field(() => MUSIC_SERVICE_PROVIDERS, { nullable: false })
  service!: MUSIC_SERVICE_PROVIDERS;

  @Field(() => [QueuePlaybackTrackInput], { nullable: false })
  tracks!: QueuePlaybackTrackInput[];
}

@InputType()
export class GetPlaybackQueueInput {
  @Field(() => MUSIC_SERVICE_PROVIDERS, { nullable: false })
  service!: MUSIC_SERVICE_PROVIDERS;
}

@InputType()
export class RemoveFromPlaybackQueueInput {
  @Field()
  index!: number;

  @Field(() => MUSIC_SERVICE_PROVIDERS, { nullable: false })
  service!: MUSIC_SERVICE_PROVIDERS;
}

@InputType()
export class SkipPlaybackQueueToIndexInput {
  @Field()
  index!: number;

  @Field(() => MUSIC_SERVICE_PROVIDERS, { nullable: false })
  service!: MUSIC_SERVICE_PROVIDERS;
}

@ObjectType()
export class PlaybackQueue {
  @Field()
  id: string;

  @Field(() => GraphQLJSON, { nullable: false })
  queueList!: any[];
}

@ObjectType()
export class AddToPlaybackQueue {
  @Field()
  id: string;
}

@ObjectType()
export class RemoveFromPlaybackQueueByIndex {
  @Field({ nullable: true })
  id: string;
}

@ObjectType()
export class SkipPlaybackQueueToIndex {
  @Field({ nullable: true })
  id: string;
}

@ObjectType()
export class ClearPlaybackQueue {
  @Field()
  success: true;
}

@InputType()
export class ClearPlaybackQueueInput {
  @Field(() => MUSIC_SERVICE_PROVIDERS, { nullable: false })
  service!: MUSIC_SERVICE_PROVIDERS;
}

@ObjectType()
export class PlaybackEntity {
  @Field()
  id: string;
}
