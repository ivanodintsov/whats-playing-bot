import { Body, ClassSerializerInterceptor, Controller, Post, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { SignInDto, SignUpRequestDto, SignUpResponseDto, SignInResponseDto } from './auth.dto';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  @Post('signin')
  async login(
    @Body() loginData: SignInDto,
    @Request() req,
  ): Promise<SignInResponseDto> {
    return this.authService.login(req.user);
  }

  @UseInterceptors(ClassSerializerInterceptor)
  @Post('signup')
  async signUp (
    @Body() user: SignUpRequestDto,
  ): Promise<SignUpResponseDto> {
    const createdUser = await this.authService.createUser(user);
    return new SignUpResponseDto(createdUser);
  }
}
