import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as UserMongo from 'src/schemas/user.schema';
import { CreateUserDto, User } from './user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserMongo.User.name) private userModel: Model<UserMongo.UserDocument>,
  ) {}

  async findOne(username: string): Promise<User | undefined> {
    return this.userModel.findOne({
      username,
    }).exec();
  }

  async create (user: CreateUserDto): Promise<User> {
    const newUser = new this.userModel(user);
    await newUser.save();
    return newUser.toObject();
  }
}