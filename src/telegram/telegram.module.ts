import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegramUser, TelegramUserSchema } from 'src/schemas/telegram.schema';
import { JwtModule } from '@nestjs/jwt';
import { SpotifyModule } from 'src/spotify/spotify.module';
import { SongWhipModule } from 'src/song-whip/song-whip.module';
import { KostyasBotModule } from 'src/kostyas-bot/kostyas-bot.module';
import { ChannelPostingService } from './channel-posting/channel-posting.service';
import { CommandsService } from './commands.service';
import { BullModule } from '@nestjs/bull';
import { TelegramProcessor } from './telegram.processor';
import { InlineService } from './inline/inline.service';
import { TelegramMessagesService } from './telegram-messages.service';

@Module({
  imports: [
    SpotifyModule,
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          token: configService.get<string>('TELEGRAM_BOT_TOKEN'),
        };
      },
      inject: [ConfigService],
    }),
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
        signOptions: { expiresIn: '60s' },
      }),
      inject: [ConfigService],
    }),
    SongWhipModule,
    KostyasBotModule,
    BullModule.registerQueue({
      name: 'telegramProcessor',
      redis: {
        host: 'datatracker-redis',
        port: 6379,
        db: 1,
      },
    }),
  ],
  providers: [
    TelegramService,
    ConfigService,
    CommandsService,
    TelegramProcessor,
    InlineService,
    TelegramMessagesService,
    ChannelPostingService,
  ],
  controllers: [TelegramController],
})
export class TelegramModule {}
