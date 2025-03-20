import {
  Args,
  Query,
  Resolver,
  Context,
  GqlExecutionContext,
} from '@nestjs/graphql';
import { Link } from 'src/songs-info/models/link.model';
import { UserEntityResponse } from './models/user.model';
import { UseGuards, ExecutionContext } from '@nestjs/common';
import {
  TelegramAuthGuard,
  TelegramWidgetAuthGuard,
} from './auth/telegram-auth.guard';
import { ContextResponse, User } from './auth/user';
import { GqlAuthGuard } from './auth/auth.guard';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Resolver(of => Link)
export class UserResolver {
  constructor(private readonly appConfig: ConfigService) {}

  @UseGuards(GqlAuthGuard)
  @Query(returns => UserEntityResponse)
  async login(
    @ContextResponse() res: Response,
    @User() user: any,
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
  @Query(returns => UserEntityResponse)
  async telegramWidgetLogin(
    @ContextResponse() res: Response,
    @User() user: any,
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
}
