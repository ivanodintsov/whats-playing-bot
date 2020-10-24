import { HttpException, HttpStatus } from '@nestjs/common';

export class TokenExpiredException extends HttpException {
  constructor() {
    super(
      'Token expired. Please recreate the signup link with /start command in telegram bot.',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
