import { Module, ModuleMetadata } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { getBotToken, TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegramUser, TelegramUserSchema } from 'src/schemas/telegram.schema';
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
import { Context } from './types';
import { TelegramBot2Message, TelegramMessage } from './message/message';
import { MusicServicesModule } from 'src/music-services/music-services.module';
import { PlaylistModule } from 'src/playlist/playlist.module';

const createModuleMetadata = (options: {
  botName: string;
  botServiceName: string;
}): ModuleMetadata => {
  return {
    imports: [
      MusicServicesModule,
      MongooseModule.forFeature([
        {
          name: TelegramUser.name,
          schema: TelegramUserSchema,
        },
      ]),
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
      PlaylistModule,
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

const botDomainContext = (ctx: Context, next) => {
  ctx.domainMessage = new TelegramMessage(ctx);
  return next();
};

const bot2DomainContext = (ctx: Context, next) => {
  ctx.domainMessage = new TelegramBot2Message(ctx);
  return next();
};

@Module({
  imports: [
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
    TelegramMainModule,
    TelegramSecondModule,
  ],
  exports: [TelegramMainModule, TelegramSecondModule],
})
export class TelegramModule {}
