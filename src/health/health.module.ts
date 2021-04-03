import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';
import { MongooseConfigService } from '../mongoose/mongoose.service';

@Module({
  imports: [
    TerminusModule,  
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useClass: MongooseConfigService,
      inject: [ConfigService],
    }),
  ],
  controllers: [HealthController]
})
export class HealthModule {}
