import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SpotifyTokensEntity {
  @Field()
  access_token: string;

  @Field()
  expires_date: number;
}

@ObjectType()
export class UserEntityResponse {
  @Field((type) => SpotifyTokensEntity, { nullable: true })
  spotifyTokens: SpotifyTokensEntity;
}
