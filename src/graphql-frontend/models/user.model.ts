import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SpotifyTokensEntity {
  @Field()
  access_token: string;

  @Field()
  refresh_token: string;

  @Field()
  expires_in: number;
}

@ObjectType()
export class UserEntityResponse {
  @Field(type => SpotifyTokensEntity, { nullable: true })
  spotifyTokens: SpotifyTokensEntity;
}
