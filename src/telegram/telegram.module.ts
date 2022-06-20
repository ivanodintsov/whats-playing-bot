import { Module, ModuleMetadata } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { getBotToken } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegramUser, TelegramUserSchema } from 'src/schemas/telegram.schema';
import { JwtModule } from '@nestjs/jwt';
import { SpotifyModule } from 'src/spotify/spotify.module';
import { SongWhipModule } from 'src/song-whip/song-whip.module';
import { TelegramMessagesService } from './telegram-messages.service';
import { MAIN_BOT, SECOND_BOT } from './constants';
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

const createModuleMetadata = (options: { botName: string }): ModuleMetadata => {
  return {
    imports: [
      SpotifyModule,
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
    ],
    providers: [
      TelegramService,
      ConfigService,
      TelegramMessagesService,
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
        provide: `${BOT_SERVICE}_${options.botName}`,
        useExisting: BOT_SERVICE,
      },
    ],
    controllers: [TelegramController],
    exports: [
      {
        provide: `${BOT_SERVICE}_${options.botName}`,
        useExisting: BOT_SERVICE,
      },
    ],
  };
};

@Module(
  createModuleMetadata({
    botName: MAIN_BOT,
  }),
)
export class TelegramMainModule {}

@Module(
  createModuleMetadata({
    botName: SECOND_BOT,
  }),
)
export class TelegramSecondModule {}
