import { ArgsType, Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SoundCloudStreamResponse {
  @Field()
  type: string;

  @Field()
  url: string;

  @Field()
  access: 'playable' | 'preview';

  @Field()
  version: string;

  @Field({ nullable: true })
  quality: number;

  @Field({ nullable: true })
  expiresAt: number;
}

@ObjectType()
export class SoundCloudUserResponse {
  @Field()
  avatar_url: string;

  @Field({ nullable: true })
  city: string | null;

  @Field({ nullable: true })
  country: string | null;

  @Field()
  created_at: string;

  @Field()
  description: string;

  @Field({ nullable: true })
  discogs_name: string | null;

  @Field()
  first_name: string;

  @Field()
  followers_count: number;

  @Field()
  followings_count: number;

  @Field()
  full_name: string;

  @Field()
  id: number;

  @Field()
  urn: string;

  @Field()
  kind: string;

  @Field()
  last_modified: string;

  @Field()
  last_name: string;

  @Field()
  likes_count: number;

  @Field()
  online: boolean;

  @Field()
  permalink: string;

  @Field()
  permalink_url: string;

  @Field()
  plan: string;

  @Field()
  playlist_count: number;

  @Field()
  public_favorites_count: number;

  @Field()
  reposts_count: number;

  @Field()
  track_count: number;

  @Field()
  uri: string;

  @Field()
  username: string;

  @Field({ nullable: true })
  website: string | null;

  @Field({ nullable: true })
  website_title: string | null;

  @Field()
  comments_count: number;

  @Field({ nullable: true })
  myspace_name: string | null;
}

@ObjectType()
export class SoundCloudReolveUrlResponse {
  @Field({ nullable: true })
  access: 'playable' | 'preview' | 'blocked';

  @Field()
  artwork_url: string;

  @Field(() => [String], { nullable: true })
  available_country_codes: string[] | null;

  @Field({ nullable: true })
  bpm: number;

  @Field()
  comment_count: number;

  @Field()
  commentable: boolean;

  @Field()
  created_at: string;

  @Field()
  description: string;

  @Field()
  download_count: number;

  @Field({ nullable: true })
  download_url: string | null;

  @Field()
  downloadable: boolean;

  @Field()
  duration: number;

  @Field()
  favoritings_count: number;

  @Field()
  genre: string;

  @Field({ nullable: true })
  id: number;

  @Field({ nullable: true })
  isrc: string | null;

  @Field({ nullable: true })
  key_signature: string | null;

  @Field()
  kind: string;

  @Field({ nullable: true })
  label_name: string;

  @Field({ nullable: true })
  license: string;

  @Field({ nullable: true })
  metadata_artist: string | null;

  @Field({ nullable: true })
  monetization_model: string | null;

  @Field()
  permalink_url: string;

  @Field()
  playback_count: number;

  @Field({ nullable: true })
  policy: string | null;

  @Field({ nullable: true })
  purchase_title: string;

  @Field({ nullable: true })
  purchase_url: string;

  @Field({ nullable: true })
  release: string | null;

  @Field({ nullable: true })
  release_day: number | null;

  @Field({ nullable: true })
  release_month: number | null;

  @Field({ nullable: true })
  release_year: number | null;

  @Field({ nullable: true })
  reposts_count: number | null;

  @Field({ nullable: true })
  sharing: string | null;

  @Field({ nullable: true })
  stream_url: string | null;

  @Field()
  streamable: boolean;

  @Field()
  tag_list: string;

  @Field()
  title: string;

  @Field()
  uri: string;

  @Field()
  urn: string;

  @Field((type) => SoundCloudUserResponse)
  user: SoundCloudUserResponse;

  @Field({ nullable: true })
  user_favorite: boolean | null;

  @Field({ nullable: true })
  user_playback_count: number | null;

  @Field({ nullable: true })
  waveform_url: string | null;
}

@ArgsType()
export class GetStreamByURLArgs {
  @Field()
  url: string;

  @Field({ nullable: true })
  failedVersion: string;
}
