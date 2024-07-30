import { Args, Query, Resolver } from '@nestjs/graphql';
import { Link } from 'src/songs-info/models/link.model';
import { UserEntityResponse } from './models/user.model';
import { UseGuards } from '@nestjs/common';
import { TelegramAuthGuard } from './auth/telegram-auth.guard';
import { User } from './auth/user';

@Resolver(of => Link)
export class UserResolver {
  // constructor() {}

  @UseGuards(TelegramAuthGuard)
  @Query(returns => UserEntityResponse)
  async login(
    @User() user: any,
    @Args('initData') initData: string, // @Args('page', { nullable: true }) page?: number,
  ) {
    return user;
  }
}
