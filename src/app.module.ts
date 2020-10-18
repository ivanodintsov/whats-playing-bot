import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MongooseConfigService } from './mongoose/mongoose.service';
import { MongooseModule } from '@nestjs/mongoose';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
