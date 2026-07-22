import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SoundCloudStreamResponse {
  @Field()
  type: string;

  @Field()
  url: string;

  @Field({ nullable: true })
  quality: number;

  @Field({ nullable: true })
  expiresAt: number;
}
