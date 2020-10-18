import { Exclude, Expose } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { CreateUserDto, User } from 'src/users/user.dto';

@Exclude()
export class SignUpRequestDto extends CreateUserDto {
  @Expose()
  @IsNotEmpty()
  @IsString()
  username: string;

  @Expose()
  @IsNotEmpty()
  @IsString()
  password: string;
}

@Exclude()
export class SignUpResponseDto extends User {
  @Expose()
  username: string;

  constructor (partial: Partial<User>) {
    super();
    Object.assign(this, partial);
  }
}

@Exclude()
export class SignInDto {
  @Expose()
  @IsNotEmpty()
  @IsString()
  username: string;

  @Expose()
  @IsNotEmpty()
  @IsString()
  password: string;
}

@Exclude()
export class SignInResponseDto {
  @Expose()
  access_token: string;

  constructor (partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
