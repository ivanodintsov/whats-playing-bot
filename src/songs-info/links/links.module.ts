import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LinksService } from './links.service';

@Module({
  providers: [LinksService, ConfigService],
  exports: [LinksService],
})
export class LinksModule {}
