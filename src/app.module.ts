import { Module } from '@nestjs/common';
import { NestjsGrammyModule } from '@grammyjs/nestjs';
import { Context } from 'grammy';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import {
  TelegramMainModule,
  TelegramModule,
  TelegramSecondModule,
} from './telegram/telegram.module';
import { SongWhipModule } from './song-whip/song-whip.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { GraphqlFrontendModule } from './graphql-frontend/graphql-frontend.module';
import { HealthModule } from './health/health.module';
import { BullModule } from '@nestjs/bull';
import { MAIN_BOT, SECOND_BOT } from './telegram/constants';
import {
  TelegramBot2Message,
  TelegramMessage,
} from './telegram/message/message';
import { BOT_QUEUE } from './bot-core/constants';
import { BotProcessor } from './bot-core/bot.processor';
import { ViewsModule } from './views/views.module';
// import { SongsLyricsModule } from './songs-lyrics/songs-lyrics.module';
import { SongsQueueModule } from './songs-queue/songs-queue.module';
import { SongsInfoModule } from './songs-info/songs-info.module';
import { DatabaseModule } from './database/database.module';
import { TrackPlaylistModule } from './track-playlist/track-playlist.module';
import { TelegramAuthModule } from './telegram-auth/telegram-auth.module';
import { GA4Module } from './utils/ga4';
import { MusicServicesModule } from './music-services/music-services.module';
import { MusicServiceProcessor } from './music-services/music-service-core/music-service.processor';

const botDomainContext = (
  ctx: Context & { domainMessage: TelegramMessage },
  next,
) => {
  ctx.domainMessage = new TelegramMessage(ctx);
  return next();
};

const bot2DomainContext = (
  ctx: Context & { domainMessage: TelegramMessage },
  next,
) => {
  ctx.domainMessage = new TelegramBot2Message(ctx);
  return next();
};

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    SongsInfoModule,
    AuthModule,
    UsersModule,
    TelegramModule,
    TelegramMainModule,
    TelegramSecondModule,
    SongWhipModule,
    ServeStaticModule.forRoot({
      serveRoot: '/backend/static',
      rootPath: join(__dirname, '..', 'static'),
    }),
    GraphqlFrontendModule,
    HealthModule,
    NestjsGrammyModule.forRootAsync({
      imports: [ConfigModule],
      botName: MAIN_BOT,
      useFactory: async (configService: ConfigService) => {
        return {
          token: configService.get<string>('TELEGRAM_BOT_TOKEN'),
          useWebhook: true,
          middlewares: [botDomainContext],
          include: [TelegramMainModule],
        };
      },

      inject: [ConfigService],
    }),
    NestjsGrammyModule.forRootAsync({
      imports: [ConfigModule],
      botName: SECOND_BOT,
      useFactory: async (configService: ConfigService) => {
        return {
          token: configService.get<string>('TELEGRAM_SECOND_BOT_TOKEN'),
          useWebhook: true,
          middlewares: [bot2DomainContext],
          include: [TelegramSecondModule],
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
    BullModule.registerQueue({
      name: BOT_QUEUE,
    }),
    ViewsModule,
    // SongsLyricsModule,
    SongsQueueModule,
    TrackPlaylistModule,
    TelegramAuthModule,
    GA4Module.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          apiSecret: configService.get<string>('MP_API_SECRET'),
          measurementId: configService.get<string>('GTM_ID'),
          clientId: configService.get<string>('MP_CLIENT_ID'),
        };
      },
    }),
    MusicServicesModule,
  ],
  controllers: [AppController],
  providers: [AppService, BotProcessor, MusicServiceProcessor],
})
export class AppModule {}
