import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SongWhip, SongWhipSchema } from 'src/schemas/song-whip.schema';
import { SongWhipService } from './song-whip.service';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      {
        name: SongWhip.name,
        schema: SongWhipSchema,
      },
    ]),
  ],
  providers: [SongWhipService],
  exports: [SongWhipService],
})
export class SongWhipModule {}
