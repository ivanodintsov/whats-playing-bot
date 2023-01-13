import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './models/user.model';
import { CreateUserDto, UserEntity } from './user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User) private userModel: typeof User) {}

  async findOne(username: string): Promise<UserEntity | undefined> {
    const user = await this.userModel.findOne({
      where: {
        username,
      },
    });

    return user.toJSON();
  }

  async create(user: CreateUserDto): Promise<UserEntity> {
    const newUser = await this.userModel.create(user);
    return newUser.toJSON();
  }

  async createEmptyUser(): Promise<UserEntity> {
    const newUser = await this.userModel.create({});
    return newUser.toJSON();
  }
}
