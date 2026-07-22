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

@ArgsType()
export class GetStreamByURLArgs {
  @Field()
  url: string;

  @Field({ nullable: true })
  failedVersion: string;
}
