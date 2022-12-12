import { Module } from '@nestjs/common';
import { SongsModule } from './songs/songs.module';

@Module({
  imports: [SongsModule],
})
export class ViewsModule {}
