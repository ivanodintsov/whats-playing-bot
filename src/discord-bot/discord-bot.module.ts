import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Intents } from 'discord.js';
import { NecordModule } from 'necord';
import {
  BOT_QUEUE,
  BOT_SERVICE,
  MESSAGES_SERVICE,
  SENDER_SERVICE,
} from 'src/bot-core/constants';
import { MusicServicesModule } from 'src/music-services/music-services.module';
import { PlaylistModule } from 'src/playlist/playlist.module';
import { DiscordUser, DiscordUserSchema } from 'src/schemas/discord.schema';
import { SongWhipModule } from 'src/song-whip/song-whip.module';
import { SongsModule } from 'src/songs/songs.module';
import { AppCommandsService } from './app-commands.service';
import { DiscordBotService } from './bot.service';
import { DISCORD_BOT_SERVICE_NAME } from './constants';
import { DiscordBotController } from './discord-bot.controller';
import { DiscordService } from './discord.service';
import { DiscordMessagesService } from './messages.service';
import { DiscordSender } from './sender.service';

@Module({
  imports: [
    MusicServicesModule,
    NecordModule.forRootAsync({
      imports: [ConfigModule],

      useFactory: async (configService: ConfigService) => {
        return {
          token: configService.get<string>('DISCORD_BOT_TOKEN'),
          intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.DIRECT_MESSAGES,
          ],
        };
      },
      inject: [ConfigService],
    }),
    SongWhipModule,
    BullModule.registerQueue({
      name: BOT_QUEUE,
    }),
    MongooseModule.forFeature([
      {
        name: DiscordUser.name,
        schema: DiscordUserSchema,
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
    PlaylistModule,
    SongsModule,
  ],
  providers: [
    DiscordService,
    AppCommandsService,
    ConfigService,

    {
      provide: SENDER_SERVICE,
      useClass: DiscordSender,
    },
    {
      provide: BOT_SERVICE,
      useClass: DiscordBotService,
    },
    {
      provide: MESSAGES_SERVICE,
      useClass: DiscordMessagesService,
    },
    {
      provide: DISCORD_BOT_SERVICE_NAME,
      useExisting: BOT_SERVICE,
    },
  ],
  controllers: [DiscordBotController],
  exports: [
    {
      provide: DISCORD_BOT_SERVICE_NAME,
      useExisting: BOT_SERVICE,
    },
  ],
})
export class DiscordBotModule {}
