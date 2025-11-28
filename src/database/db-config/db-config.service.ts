import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SequelizeOptionsFactory,
  SequelizeModuleOptions,
} from '@nestjs/sequelize';

@Injectable()
export class DbConfigService implements SequelizeOptionsFactory {
  constructor(private readonly appConfig: ConfigService) {}

  createSequelizeOptions(): SequelizeModuleOptions {
    return {
      dialect: this.appConfig.get('DB_DIALECT'),
      host: this.appConfig.get<string>('DB_HOST'),
      port: parseInt(this.appConfig.get('DB_PORT'), 10),
      username: this.appConfig.get<string>('DB_USER'),
      password: this.appConfig.get<string>('DB_PASSWORD'),
      database: this.appConfig.get<string>('DB_NAME'),
      // pool: {
      //   max: 4,
      //   min: 1,
      //   acquire: 30000,
      //   idle: 10000,
      //   evict: 15000,
      // },
      // retry: {
      //   max: 3,
      //   match: [/SequelizeConnectionAcquireTimeoutError/],
      // },
      autoLoadModels: true,
      synchronize: false,
      logging: false,
    };
  }
}
