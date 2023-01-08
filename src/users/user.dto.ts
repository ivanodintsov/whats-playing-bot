import { IsNotEmpty } from 'class-validator';

export class UserEntity {
  id?: string;
  username?: string;
  password?: string;
}

export class CreateUserDto {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  password: string;
}
