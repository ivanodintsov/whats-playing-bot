import { Args, Query, Resolver } from '@nestjs/graphql';
import { UserEntity, UserEntityResponse } from './models/user.model';
import { ContextResponse, User } from './auth/user';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  AuthorizeMusicServiceArgs,
  AuthorizeMusicServiceResponse,
} from './models/music-service';
import { MusicServicesService } from 'src/music-services/music-services.service';
import { AutherizedContext } from 'src/auth/types';
import { ThrottlerGqlAuth } from './throttler/guards/throttler-gql-auth';

@Resolver((of) => UserEntity)
export class UserResolver {
  constructor(
    private readonly appConfig: ConfigService,
    private readonly musicServices: MusicServicesService,
  ) {}

  @ThrottlerGqlAuth(10)
  @Query((returns) => UserEntityResponse)
  async login(
    @ContextResponse() res: Response,
    @User() user: AutherizedContext,
    @Args('initData') initData: string,
  ) {
    const { access_token, ...restUser } = user;

    const COOKIE_AUTH_DOMAIN = this.appConfig.get<string>('COOKIE_AUTH_DOMAIN');
    res.cookie('wsps_atj', access_token, {
      domain: COOKIE_AUTH_DOMAIN,
      signed: true,
      secure: true,
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 86400000,
    });

    return restUser;
  }

  @ThrottlerGqlAuth(10)
  @Query((returns) => UserEntityResponse)
  async telegramWidgetLogin(
    @ContextResponse() res: Response,
    @User() user: AutherizedContext,
    @Args('initData') initData: string,
  ) {
    const { access_token, ...restUser } = user;

    const COOKIE_AUTH_DOMAIN = this.appConfig.get<string>('COOKIE_AUTH_DOMAIN');
    res.cookie('wsps_atj', access_token, {
      domain: COOKIE_AUTH_DOMAIN,
      signed: true,
      secure: true,
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 86400000,
    });

    return restUser;
  }

  @ThrottlerGqlAuth(10)
  @Query((returns) => AuthorizeMusicServiceResponse)
  async authorizeMusicService(
    @ContextResponse() res: Response,
    @User() user: AutherizedContext,
    @Args() args: AuthorizeMusicServiceArgs,
  ) {
    const tokens = await this.musicServices.getTokens({
      user: user.user,
      musicServiceType: args.musicServiceProvider,
      provider: args.platformProvider,
    });

    return {
      provider: args.musicServiceProvider,
      tokens,
    };
  }
}
