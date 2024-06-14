import { Module, ModuleMetadata } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { getBotToken } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SpotifyModule } from 'src/spotify/spotify.module';
import { SongWhipModule } from 'src/song-whip/song-whip.module';
import {
  MAIN_BOT,
  MAIN_TELEGRAM_BOT_SERVICE_NAME,
  SECOND_BOT,
  SECOND_TELEGRAM_BOT_SERVICE_NAME,
  TELEGRAM_QUEUE,
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
      SpotifyModule,
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
      BullModule.registerQueue({
        name: TELEGRAM_QUEUE,
      }),
      TrackStatisticsModule,
      UsersModule,
      TrackPlaylistModule,
    ],
    providers: [
      TelegramService,
      ConfigService,
      {
        provide: 'TELEGRAM_MODULE_BOT',
        useFactory: bot => bot,
        inject: [getBotToken(options.botName)],
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
    ],
    controllers: [TelegramController],
    exports: [
      {
        provide: options.botServiceName,
        useExisting: BOT_SERVICE,
      },
    ],
  };
};

@Module(
  createModuleMetadata({
    botName: MAIN_BOT,
    botServiceName: MAIN_TELEGRAM_BOT_SERVICE_NAME,
  }),
)
export class TelegramMainModule {}

@Module(
  createModuleMetadata({
    botName: SECOND_BOT,
    botServiceName: SECOND_TELEGRAM_BOT_SERVICE_NAME,
  }),
)
export class TelegramSecondModule {}
