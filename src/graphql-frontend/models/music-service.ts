import { ArgsType, Field, ObjectType } from '@nestjs/graphql';
import { CLIENT_UNIQUE_PROVIDES, MUSIC_SERVICE_PROVIDERS } from 'src/constants';

@ArgsType()
export class AuthorizeMusicServiceArgs {
  @Field((type) => MUSIC_SERVICE_PROVIDERS)
  musicServiceProvider: MUSIC_SERVICE_PROVIDERS;

  @Field((type) => CLIENT_UNIQUE_PROVIDES)
  platformProvider: CLIENT_UNIQUE_PROVIDES;
}

@ObjectType()
export class MusicServiceTokenEntity {
  @Field()
  access_token: string;

  @Field()
  expires_date: number;
}

@ObjectType()
export class AuthorizeMusicServiceResponse {
  @Field((type) => MUSIC_SERVICE_PROVIDERS, { nullable: false })
  provider: MUSIC_SERVICE_PROVIDERS;

  @Field((type) => MusicServiceTokenEntity, { nullable: false })
  tokens: MusicServiceTokenEntity;
}
