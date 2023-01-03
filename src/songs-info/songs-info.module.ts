import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SpotifyModule } from 'src/spotify/spotify.module';
import { Album } from './models/album.model';
import { Artist } from './models/artist.model';
import { Song, SongSchema } from './models/song.schema';
import { SongsInfoController } from './songs-info.controller';
import { SpotifyParserModule } from './spotify-parser/spotify-parser.module';
import { YoutubeParserModule } from './youtube-parser/youtube-parser.module';
import { BullModule } from '@nestjs/bull';
import { SongsInfoProcessor } from './songs-info.processor';
import { SongsInfoService } from './songs-info.service';
import { TidalParserModule } from './tidal-parser/tidal-parser.module';
import { SongsService } from './songs/songs.service';
import { Genre } from './models/genre.model';
import { SequelizeModule } from '@nestjs/sequelize';
import { ArtistGenre } from './models/artist-genre.model';
import { Link } from './models/link.model';
import { AlbumArtist } from './models/album-artist.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Genre,
      Album,
      Artist,
      ArtistGenre,
      Link,
      AlbumArtist,
    ]),
    MongooseModule.forFeature([
      {
        name: Song.name,
        schema: SongSchema,
      },
    ]),
    SpotifyModule,
    SpotifyParserModule,
    YoutubeParserModule,

    BullModule.registerQueue({
      name: 'songsInfoQueue',
    }),

    TidalParserModule,
  ],
  providers: [SongsInfoProcessor, SongsInfoService, SongsService],
  controllers: [SongsInfoController],
})
export class SongsInfoModule {}
