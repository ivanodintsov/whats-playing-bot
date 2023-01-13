import { Module } from '@nestjs/common';
import { TidalParserService } from './tidal-parser.service';

@Module({
  providers: [TidalParserService],
  exports: [TidalParserService],
})
export class TidalParserModule {}
