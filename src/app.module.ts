import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MongooseConfigService } from './mongoose/mongoose.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SongWhipModule } from './song-whip/song-whip.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { GraphqlFrontendModule } from './graphql-frontend/graphql-frontend.module';
import { HealthModule } from './health/health.module';
import { BullModule } from '@nestjs/bull';
import { BOT_QUEUE } from './bot-core/constants';
import { BotProcessor } from './bot-core/bot.processor';
import { DiscordBotModule } from './discord-bot/discord-bot.module';
import { TelegramModule } from './telegram/telegram.module';
import { MusicServicesModule } from './music-services/music-services.module';
import { PlaylistModule } from './playlist/playlist.module';
import { SongsModule } from './songs/songs.module';

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
    SongWhipModule,
    ServeStaticModule.forRoot({
      serveRoot: '/backend/static',
      rootPath: join(__dirname, '..', 'static'),
    }),
    GraphqlFrontendModule,
    HealthModule,
    TelegramModule,
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
    DiscordBotModule,
    MusicServicesModule,
    PlaylistModule,
    SongsModule,
  ],
  controllers: [AppController],
  providers: [AppService, BotProcessor],
})
export class AppModule {}
