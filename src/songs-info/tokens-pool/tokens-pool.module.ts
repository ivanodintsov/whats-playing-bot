import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { TokensPoolService } from './tokens-pool.service';
import { MusicServiceToken } from 'src/music-services/models/music-service-token.model';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    SequelizeModule.forFeature([MusicServiceToken]),
    RedisModule,
  ],
  providers: [TokensPoolService],
  exports: [TokensPoolService],
})
export class TokensPoolModule {}
