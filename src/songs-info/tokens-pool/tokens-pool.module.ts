import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import Redis from 'ioredis';
import { TokensPoolService } from './tokens-pool.service';
import { MusicServiceToken } from 'src/music-services/models/music-service-token.model';

@Module({
  imports: [
    ConfigModule.forRoot(),
    SequelizeModule.forFeature([MusicServiceToken]),
  ],
  providers: [
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
    TokensPoolService,
  ],
  exports: [TokensPoolService],
})
export class TokensPoolModule {}
