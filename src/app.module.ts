import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MongooseConfigService } from './mongoose/mongoose.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SpotifyModule } from './spotify/spotify.module';
import {
  TelegramMainModule,
  TelegramSecondModule,
} from './telegram/telegram.module';
import { SongWhipModule } from './song-whip/song-whip.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { GraphqlFrontendModule } from './graphql-frontend/graphql-frontend.module';
import { HealthModule } from './health/health.module';
import { BullModule } from '@nestjs/bull';
import { TelegrafModule } from 'nestjs-telegraf';
import { MAIN_BOT, SECOND_BOT } from './telegram/constants';
import {
  TelegramBot2Message,
  TelegramMessage,
} from './telegram/message/message';
import { Context } from 'telegraf';
import { BOT_QUEUE } from './bot-core/constants';
import { BotProcessor } from './bot-core/bot.processor';
import { ViewsModule } from './views/views.module';

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
    AuthModule,
    UsersModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useClass: MongooseConfigService,
      inject: [ConfigService],
    }),
    SpotifyModule,
    TelegramMainModule,
    TelegramSecondModule,
    SongWhipModule,
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
          launchOptions: {
            webhook: {
              domain: configService.get<string>('TELEGRAM_BOT_WEBHOOK_DOMAIN'),
              hookPath: configService.get<string>('TELEGRAM_BOT_WEBHOOK_PATH'),
            },
          },
          middlewares: [botDomainContext],
          include: [TelegramMainModule],
        };
      },
      inject: [ConfigService],
    }),
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      botName: SECOND_BOT,
      useFactory: async (configService: ConfigService) => {
        return {
          token: configService.get<string>('TELEGRAM_SECOND_BOT_TOKEN'),
          launchOptions: {
            webhook: {
              domain: configService.get<string>(
                'TELEGRAM_SECOND_BOT_WEBHOOK_DOMAIN',
              ),
              hookPath: configService.get<string>(
                'TELEGRAM_SECOND_BOT_WEBHOOK_PATH',
              ),
            },
          },
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
  ],
  controllers: [AppController],
  providers: [AppService, BotProcessor],
})
export class AppModule {}
