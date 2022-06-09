import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MongooseConfigService } from './mongoose/mongoose.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SpotifyModule } from './spotify/spotify.module';
import { TelegramMainModule } from './telegram/telegram.module';
import { SongWhipModule } from './song-whip/song-whip.module';
import { KostyasBotModule } from './kostyas-bot/kostyas-bot.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { GraphqlFrontendModule } from './graphql-frontend/graphql-frontend.module';
import { HealthModule } from './health/health.module';
import { BullModule } from '@nestjs/bull';
import { TelegrafModule } from 'nestjs-telegraf';
import { MAIN_BOT } from './telegram/constants';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthModule,
    UsersModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useClass: MongooseConfigService,
      inject: [ConfigService],
    }),
    SpotifyModule,
    TelegramMainModule,
    SongWhipModule,
    KostyasBotModule,
    ServeStaticModule.forRoot({
      serveRoot: '/backend/static',
      rootPath: join(__dirname, '..', 'static'),
    }),
    GraphqlFrontendModule,
    HealthModule,
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      botName: MAIN_BOT,
      useFactory: async (configService: ConfigService) => {
        return {
          token: configService.get<string>('TELEGRAM_BOT_TOKEN'),
          include: [TelegramMainModule],
          launchOptions: {
            webhook: {
              domain: configService.get<string>('TELEGRAM_BOT_WEBHOOK_DOMAIN'),
              hookPath: configService.get<string>('TELEGRAM_BOT_WEBHOOK_PATH'),
            },
          },
        };
      },
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          redis: {
            host: configService.get('QUEUE_HOST'),
            port: +configService.get('QUEUE_PORT'),
            db: configService.get('QUEUE_DB'),
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
