
import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { SignUpRequestDto } from './auth.dto';
import { User } from 'src/users/user.dto';

@Injectable()
export class AuthService {
  private SALTS_ROUNDS = 10;

  constructor(private usersService: UsersService) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);

    if (user && await this.checkPassword(user, pass)) {
      const { password, ...result } = user;
      return result;
    }

    return null;
  }

  async createUser (user: SignUpRequestDto): Promise<User> {
    const hash = await this.hashUserPassword(user);
    user.password = hash;
    return this.usersService.create(user);
  }

  private hashUserPassword(user: SignUpRequestDto): Promise<string> {
    return bcrypt.hash(user.password, this.SALTS_ROUNDS);
  }

  private checkPassword(user, password) {
    return bcrypt.compare(password, user.password);
  }
}