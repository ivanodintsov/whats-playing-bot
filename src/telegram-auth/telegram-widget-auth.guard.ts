import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class TelegramWidgetAuthGuard extends AuthGuard('telegram-widget') {}
