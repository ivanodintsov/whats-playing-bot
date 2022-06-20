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
import { CommandsService } from './commands.service';
import { BullModule, getQueueToken, Processor } from '@nestjs/bull';
import { TelegramProcessor } from './telegram.processor';
import { TelegramMessagesService } from './telegram-messages.service';
import {
  MAIN_BOT,
  MAIN_BOT_QUEUE,
  SECOND_BOT,
  SECOND_BOT_QUEUE,
} from './constants';
import { TelegramSender } from './telegram-sender.service';
import {
  BOT_SERVICE,
  MESSAGES_SERVICE,
  SENDER_SERVICE,
} from 'src/bot-core/constants';
import { TelegramBotService } from './bot.service';
import { MessagesService } from './messages.service';

const createModuleMetadata = (options: {
  botName: string;
  queueName: string;
}): ModuleMetadata => {
  @Processor(options.queueName)
  class TelegramProcessorNamed extends TelegramProcessor {}

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
        name: options.queueName,
      }),
    ],
    providers: [
      TelegramService,
      ConfigService,
      CommandsService,
      TelegramMessagesService,
      {
        provide: 'TELEGRAM_MODULE_QUEUE',
        useFactory: queue => queue,
        inject: [getQueueToken(options.queueName)],
      },
      {
        provide: 'TELEGRAM_MODULE_BOT',
        useFactory: bot => bot,
        inject: [getBotToken(options.botName)],
      },
      TelegramProcessorNamed,
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
    ],
    controllers: [TelegramController],
  };
};

@Module(
  createModuleMetadata({
    queueName: MAIN_BOT_QUEUE,
    botName: MAIN_BOT,
  }),
)
export class TelegramMainModule {}

@Module(
  createModuleMetadata({
    queueName: SECOND_BOT_QUEUE,
    botName: SECOND_BOT,
  }),
)
export class TelegramSecondModule {}
