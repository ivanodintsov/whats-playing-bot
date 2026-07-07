import { Module } from '@nestjs/common';
import { Album } from './models/album.model';
import { Artist } from './models/artist.model';
// import { SongsInfoController } from './songs-info.controller';
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
import { Track } from './models/track.model';
import { TrackArtist } from './models/track-artists.model';
import { SongWhipModule } from 'src/song-whip/song-whip.module';
import { ArtistSocial } from './models/artist-social.model';
import { ProcessService } from './process/process.service';
import {
  PARSE_ALBUMS_QUEUE,
  PARSE_ARTISTS_QUEUE,
  PARSE_TRACKS_QUEUE,
} from './constants';
import { ParseTracksProcessor } from './parse-tracks.processor';
import { ParseAlbumsProcessor } from './parse-albums.processor';
import { ParseArtistsProcessor } from './parse-artists.processor';
// import { SongsLyricsModule } from 'src/songs-lyrics/songs-lyrics.module';
import { TrackStatisticsModule } from './track-statistics/track-statistics.module';
import { LinksModule } from './links/links.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    SequelizeModule.forFeature([
      Genre,
      Album,
      Artist,
      ArtistGenre,
      Link,
      AlbumArtist,
      Track,
      TrackArtist,
      ArtistSocial,
    ]),
    SpotifyParserModule,
    YoutubeParserModule,

    BullModule.registerQueue(
      {
        name: 'songsInfoQueue',
        limiter: {
          max: 2,
          duration: 1000,
        },
      },
      {
        name: PARSE_TRACKS_QUEUE,
        limiter: {
          max: 1,
          duration: parseInt(process.env.PARSE_TRACKS_DURATION, 10),
        },
      },
      {
        name: PARSE_ARTISTS_QUEUE,
        limiter: {
          max: 1,
          duration: parseInt(process.env.PARSE_ARTISTS_DURATION, 10),
        },
      },
      {
        name: PARSE_ALBUMS_QUEUE,
        limiter: {
          max: 1,
          duration: parseInt(process.env.PARSE_ALBUMS_DURATION, 10),
        },
      },
    ),

    TidalParserModule,
    SongWhipModule,
    // SongsLyricsModule,
    TrackStatisticsModule,
    LinksModule,
  ],
  providers: [
    SongsInfoService,
    SongsService,
    ProcessService,
    SongsInfoProcessor,
    ParseTracksProcessor,
    ParseAlbumsProcessor,
    ParseArtistsProcessor,
  ],
  controllers: [],
  exports: [SongsInfoService],
})
export class SongsInfoModule {}
