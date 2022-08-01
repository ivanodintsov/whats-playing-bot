import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SongsService } from './songs.service';
import { Album, AlbumSchema } from './schemas/album.schema';
import { Artist, ArtistSchema } from './schemas/artist.schema';
import { Song, SongSchema } from './schemas/song.schema';
import { MusicServicesModule } from 'src/music-services/music-services.module';
import { SongWhipModule } from 'src/song-whip/song-whip.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Song.name,
        schema: SongSchema,
      },
      {
        name: Artist.name,
        schema: ArtistSchema,
      },
      {
        name: Album.name,
        schema: AlbumSchema,
      },
    ]),
    MusicServicesModule,
    SongWhipModule,
  ],
  providers: [SongsService],
  exports: [SongsService],
})
export class SongsModule {}
