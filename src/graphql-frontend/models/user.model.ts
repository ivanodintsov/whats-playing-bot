import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class MusicServiceTokenEntity {
  @Field()
  access_token: string;

  @Field()
  expires_date: number;
}

@ObjectType()
export class UserEntityResponse {
  @Field((type) => MusicServiceTokenEntity, { nullable: true })
  spotifyTokens: MusicServiceTokenEntity;
}
