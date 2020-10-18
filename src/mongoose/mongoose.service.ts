import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions, MongooseOptionsFactory } from '@nestjs/mongoose';

@Injectable()
export class MongooseConfigService implements MongooseOptionsFactory {
  constructor(private readonly appConfig: ConfigService) {}

  createMongooseOptions(): MongooseModuleOptions {
    const uri = this.appConfig.get<string>('MONGO_URI');

    return {
      uri,
    };
  }
}