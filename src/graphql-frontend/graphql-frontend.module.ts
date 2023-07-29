import { CacheModule, Module } from '@nestjs/common';
import { GraphQLModule, registerEnumType } from '@nestjs/graphql';
import { join } from 'path';
import { TrackEntityResolver } from './track-entity.resolver';
import { SpotifyModule } from 'src/spotify/spotify.module';
import { SongWhipModule } from 'src/song-whip/song-whip.module';
import { LastPlaylistResolver } from './last-playlist.resolver';
import * as redisStore from 'cache-manager-redis-store';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { SongsModule } from 'src/views/songs/songs.module';
import { SongsLyricsModule } from 'src/songs-lyrics/songs-lyrics.module';
import { SongsInfoModule } from 'src/songs-info/songs-info.module';
import { TrackPlaylistModule } from 'src/track-playlist/track-playlist.module';
import { LinksModule } from 'src/songs-info/links/links.module';
import { TrackStatisticsModule } from 'src/songs-info/track-statistics/track-statistics.module';
import { ALBUM_TYPE } from 'src/songs-info/types/parser';
import UTCDate from './scalar/UTCDate';

registerEnumType(ALBUM_TYPE, {
  name: 'AlbumType',
});

@Module({
  imports: [
    SongsLyricsModule,
    SongsInfoModule,
    SongsModule,
    SongWhipModule,
    SpotifyModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      useGlobalPrefix: true,
      driver: ApolloDriver,
      resolvers: {
        UTCDate: UTCDate,
      },
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          store: redisStore,
          host: configService.get('CACHE_HOST'),
          port: +configService.get('CACHE_PORT'),
          db: +configService.get('CACHE_DB'),
          ttl: 15,
          max: 100,
        };
      },
      inject: [ConfigService],
    }),
    TrackPlaylistModule,
    LinksModule,
    TrackStatisticsModule,
  ],
  providers: [TrackEntityResolver, LastPlaylistResolver],
})
export class GraphqlFrontendModule {}
