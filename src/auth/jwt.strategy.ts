import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

const cookieExtractor = (req: Request) => {
  let token = null;
  if (req && req.cookies) token = req.signedCookies['wsps_atj'];
  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly appConfig: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: appConfig.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return this.authService.validateJWT(payload.id);
  }
}
