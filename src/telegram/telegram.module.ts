import Redis from 'ioredis';
import { MiddlewareConsumer, Module, ModuleMetadata } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { getBotName } from '@grammyjs/nestjs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SongWhipModule } from 'src/song-whip/song-whip.module';
import {
  MAIN_BOT,
  MAIN_TELEGRAM_BOT_SERVICE_NAME,
  SECOND_BOT,
  SECOND_TELEGRAM_BOT_SERVICE_NAME,
} from './constants';
import { TelegramSender } from './telegram-sender.service';
import {
  BOT_QUEUE,
  BOT_SERVICE,
  MESSAGES_SERVICE,
  SENDER_SERVICE,
} from 'src/bot-core/constants';
import { TelegramBotService } from './bot.service';
import { MessagesService } from './messages.service';
import { BullModule } from '@nestjs/bull';
import { SongsInfoModule } from 'src/songs-info/songs-info.module';
import { TrackStatisticsModule } from 'src/songs-info/track-statistics/track-statistics.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { TelegramUser } from './models/telegram-user.model';
import { UsersModule } from 'src/users/users.module';
import { TrackPlaylistModule } from 'src/track-playlist/track-playlist.module';
import { LinksModule } from 'src/songs-info/links/links.module';
import { GA4Module } from 'src/utils/ga4';
import { Bot, Context, webhookCallback } from 'grammy';
import { InjectBot } from '@grammyjs/nestjs';
import { MusicServicesModule } from 'src/music-services/music-services.module';
import { TokensPoolModule } from 'src/songs-info/tokens-pool/tokens-pool.module';

const createModuleMetadata = (options: {
  botName: string;
  botServiceName: string;
}): ModuleMetadata => {
  return {
    imports: [
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
      SongsInfoModule,
      LinksModule,
      MusicServicesModule,
      SequelizeModule.forFeature([TelegramUser]),
      JwtModule.registerAsync({
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          secret: configService.get<string>('TELEGRAM_JWT_SECRET'),
          signOptions: { expiresIn: '10m' },
        }),
        inject: [ConfigService],
      }),
      SongWhipModule,
      BullModule.registerQueue({
        name: BOT_QUEUE,
      }),
      TrackStatisticsModule,
      UsersModule,
      TrackPlaylistModule,
      TokensPoolModule,
    ],
    providers: [
      TelegramService,
      ConfigService,
      {
        provide: 'TELEGRAM_MODULE_BOT',
        useFactory: (bot) => bot,
        inject: [getBotName(options.botName)],
      },
      {
        provide: SENDER_SERVICE,
        useClass: TelegramSender,
      },
      {
        provide: BOT_SERVICE,
        useClass: TelegramBotService,
      },
      {
        provide: MESSAGES_SERVICE,
        useClass: MessagesService,
      },
      {
        provide: options.botServiceName,
        useExisting: BOT_SERVICE,
      },
      {
        provide: Redis,
        useFactory: (configService: ConfigService) =>
          new Redis(
            `redis://${configService.get('CACHE_HOST')}:${+configService.get(
              'CACHE_PORT',
            )}/${+configService.get('CACHE_DB')}`,
          ),
        inject: [ConfigService],
      },
    ],
    exports: [
      {
        provide: options.botServiceName,
        useExisting: BOT_SERVICE,
      },
    ],
  };
};

@Module({
  imports: [
    ConfigModule,
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
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('TELEGRAM_JWT_SECRET'),
        signOptions: { expiresIn: '10m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TelegramController],
})
export class TelegramModule {}

const getIsprimary = () => {
  const isPrimary =
    process.env.NODE_APP_INSTANCE === '0' ||
    process.env.pm_id === '0' ||
    (process.env.NODE_APP_INSTANCE === undefined &&
      process.env.pm_id === undefined);

  return isPrimary;
};

@Module(
  createModuleMetadata({
    botName: MAIN_BOT,
    botServiceName: MAIN_TELEGRAM_BOT_SERVICE_NAME,
  }),
)
export class TelegramMainModule {
  constructor(
    @InjectBot(MAIN_BOT)
    private readonly bot: Bot<Context>,
    private appConfig: ConfigService,
  ) {}

  async configure(consumer: MiddlewareConsumer) {
    const URL = `${this.appConfig.get<string>(
      'TELEGRAM_BOT_WEBHOOK_DOMAIN',
    )}${this.appConfig.get<string>('TELEGRAM_BOT_WEBHOOK_PATH')}`;

    const isPrimary = getIsprimary();

    if (isPrimary) {
      await this.bot.api.setWebhook(URL);
    }

    consumer
      .apply(webhookCallback(this.bot, 'express'))
      .forRoutes(`${this.appConfig.get('TELEGRAM_BOT_WEBHOOK_PATH')}`);
  }
}

@Module(
  createModuleMetadata({
    botName: SECOND_BOT,
    botServiceName: SECOND_TELEGRAM_BOT_SERVICE_NAME,
  }),
)
export class TelegramSecondModule {
  constructor(
    @InjectBot(SECOND_BOT)
    private readonly bot: Bot<Context>,
    private appConfig: ConfigService,
  ) {}

  async configure(consumer: MiddlewareConsumer) {
    const URL = `${this.appConfig.get<string>(
      'TELEGRAM_SECOND_BOT_WEBHOOK_DOMAIN',
    )}${this.appConfig.get<string>('TELEGRAM_SECOND_BOT_WEBHOOK_PATH')}`;

    const isPrimary = getIsprimary();

    if (isPrimary) {
      await this.bot.api.setWebhook(URL);
    }

    consumer
      .apply(webhookCallback(this.bot, 'express'))
      .forRoutes(`${this.appConfig.get('TELEGRAM_SECOND_BOT_WEBHOOK_PATH')}`);
  }
}
