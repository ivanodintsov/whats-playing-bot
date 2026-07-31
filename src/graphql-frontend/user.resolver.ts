import { Args, Query, Resolver } from '@nestjs/graphql';
import { UserEntity, UserEntityResponse } from './models/user.model';
import { UseGuards } from '@nestjs/common';
import { TelegramWidgetAuthGuard } from './auth/telegram-auth.guard';
import { ContextResponse, User } from './auth/user';
import { GqlAuthGuard } from './auth/auth.guard';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  AuthorizeMusicServiceArgs,
  AuthorizeMusicServiceResponse,
} from './models/music-service';
import { MusicServicesService } from 'src/music-services/music-services.service';
import { AutherizedContext } from 'src/auth/types';

@Resolver((of) => UserEntity)
export class UserResolver {
  constructor(
    private readonly appConfig: ConfigService,
    private readonly musicServices: MusicServicesService,
  ) {}

  @UseGuards(GqlAuthGuard)
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

  @UseGuards(TelegramWidgetAuthGuard)
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

  @UseGuards(GqlAuthGuard)
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
