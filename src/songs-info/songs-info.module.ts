import { Module } from '@nestjs/common';
// import { SongsInfoController } from './songs-info.controller';
import { SpotifyParserModule } from './spotify-parser/spotify-parser.module';
import { BullModule } from '@nestjs/bull';
import { SongsInfoProcessor } from './songs-info.processor';
import { SongsInfoService } from './songs-info.service';
import { SongWhipModule } from 'src/song-whip/song-whip.module';
import { ProcessService } from './process/process.service';
import { ParseTracksProcessor } from './parse-tracks.processor';
import { ParseAlbumsProcessor } from './parse-albums.processor';
import { ParseArtistsProcessor } from './parse-artists.processor';
// import { SongsLyricsModule } from 'src/songs-lyrics/songs-lyrics.module';
import { TrackStatisticsModule } from './track-statistics/track-statistics.module';
import { LinksModule } from './links/links.module';
import { ConfigModule } from '@nestjs/config';
import { SoundcloudParserModule } from './soundcloud-parser/soundcloud-parser.module';
import { TokensPoolModule } from './tokens-pool/tokens-pool.module';
import { SongsModule } from './songs/songs.module';
import { SONGS_INFO_QUEUE } from './constants';

@Module({
  imports: [
    ConfigModule.forRoot(),
    SpotifyParserModule,
    BullModule.registerQueue({
      name: SONGS_INFO_QUEUE,
      limiter: {
        max: 2,
        duration: 1000,
      },
    }),
    SongWhipModule,
    // SongsLyricsModule,
    TrackStatisticsModule,
    LinksModule,
    SoundcloudParserModule,
    TokensPoolModule,
    SongsModule,
  ],
  providers: [
    SongsInfoService,
    ProcessService,
    SongsInfoProcessor,
    ParseTracksProcessor,
    ParseAlbumsProcessor,
    ParseArtistsProcessor,
  ],
  controllers: [],
  exports: [SongsInfoService, SongsModule],
})
export class SongsInfoModule {}
