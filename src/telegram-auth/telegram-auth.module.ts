import { Module } from '@nestjs/common';
import { TelegramAuthService } from './telegram-auth.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';
import { SpotifyModule } from 'src/spotify/spotify.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { TelegramStrategy } from './telegram-auth.strategy';
import { TelegramWidgetStrategy } from './telegram-widget-auth.strategy';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    SequelizeModule.forFeature([TelegramUser]),
    SpotifyModule,
    AuthModule,
  ],
  providers: [
    TelegramAuthService,
    TelegramStrategy,
    TelegramWidgetStrategy,
    ConfigService,
  ],
  exports: [TelegramAuthService],
})
export class TelegramAuthModule {}
