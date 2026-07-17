import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { REDIS_WITH_CUSTOM_METHODS_PROVIDER } from './redis-with-custom-methods';
import { REDIS_WITH_CUSTOM_METHODS } from './redis-with-custom-methods/constants';

@Module({
  imports: [ConfigModule],
  providers: [REDIS_WITH_CUSTOM_METHODS_PROVIDER],
  exports: [REDIS_WITH_CUSTOM_METHODS],
})
export class RedisModule {}
