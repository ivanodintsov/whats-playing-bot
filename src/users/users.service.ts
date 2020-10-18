import { Injectable } from '@nestjs/common';
import { CreateUserDto, User } from './user.dto';

@Injectable()
export class UsersService {
  private readonly users: User[];

  constructor() {
    this.users = [
      {
        id: 1,
        username: 'john',
        password: 'changeme',
      },
      {
        id: 2,
        username: 'chris',
        password: 'secret',
      },
      {
        id: 3,
        username: 'maria',
        password: 'guess',
      },
    ];
  }

  async findOne(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }

  async create (user: CreateUserDto): Promise<User> {
    const newUser = {
      id: 2,
      ...user,
    };
    this.users.push(newUser);
    return newUser;
  }
}