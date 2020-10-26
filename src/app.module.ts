import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MongooseConfigService } from './mongoose/mongoose.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SpotifyModule } from './spotify/spotify.module';
import { TelegramModule } from './telegram/telegram.module';
import { SongWhipModule } from './song-whip/song-whip.module';
import { KostyasBotModule } from './kostyas-bot/kostyas-bot.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

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
    TelegramModule,
    SongWhipModule,
    KostyasBotModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'static'),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
