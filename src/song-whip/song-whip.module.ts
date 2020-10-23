import { HttpModule, Module } from '@nestjs/common';
import { SongWhipService } from './song-whip.service';

@Module({
  imports: [HttpModule],
  providers: [SongWhipService],
  exports: [SongWhipService],
})
export class SongWhipModule {}
