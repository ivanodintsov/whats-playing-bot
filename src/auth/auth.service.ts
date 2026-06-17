import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { SignUpRequestDto } from './auth.dto';
import { UserEntity } from 'src/users/user.dto';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/models/user.model';
import { InjectModel } from '@nestjs/sequelize';
import { UserNotExistsError } from 'src/bot-core/errors';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';
import { SpotifyService } from 'src/spotify/spotify.service';
import { CLIENT_UNIQUE_PROVIDES } from 'src/constants';
import { SpotifyTokenDomain } from 'src/spotify/models/spotify-token.model';

@Injectable()
export class AuthService {
  private SALTS_ROUNDS = 10;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private readonly spotifyService: SpotifyService,
    @InjectModel(User) private userModel: typeof User,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);

    if (user && (await this.checkPassword(user, pass))) {
      const { password, ...result } = user;
      return result;
    }

    return null;
  }

  async validateJWT(id: string): Promise<any> {
    const user = await this.userModel.findOne({
      where: {
        id,
      },
      include: [{ model: TelegramUser }],
    });

    if (!user) {
      throw new UserNotExistsError();
    }

    let tokens: SpotifyTokenDomain | undefined;

    if (user.tgUser?.id) {
      tokens = await this.spotifyService.updateTokens({
        provider: CLIENT_UNIQUE_PROVIDES.TELEGRAM,
        userId: user.tgUser.id,
      });
    }

    const loginData = await this.login(user);

    return {
      spotifyTokens: tokens
        ? {
            access_token: tokens.access_token,
            expires_date: tokens.expires_date,
          }
        : undefined,
      user: user,
      provider: 'jwt',
      ...loginData,
    };
  }

  async createUser(user: SignUpRequestDto): Promise<UserEntity> {
    const hash = await this.hashUserPassword(user);
    user.password = hash;
    return this.usersService.create(user);
  }

  async login(user: UserEntity) {
    const payload = {
      username: user.username,
      id: user.id,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  private hashUserPassword(user: SignUpRequestDto): Promise<string> {
    return bcrypt.hash(user.password, this.SALTS_ROUNDS);
  }

  private checkPassword(user, password) {
    return bcrypt.compare(password, user.password);
  }
}
