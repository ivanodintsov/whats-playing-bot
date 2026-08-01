import { Module } from '@nestjs/common';
import { GraphQLJSON } from 'graphql-scalars';
import { Cache } from 'cache-manager';
import { CacheManagerOptions, CacheModule } from '@nestjs/cache-manager';
import { GraphQLModule, registerEnumType } from '@nestjs/graphql';
import KeyvRedis from '@keyv/redis';
import { join } from 'path';
import { TrackEntityResolver } from './track-entity.resolver';
import { SongWhipModule } from 'src/song-whip/song-whip.module';
import { LastPlaylistResolver } from './last-playlist.resolver';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { SongsModule } from 'src/views/songs/songs.module';
// import { SongsLyricsModule } from 'src/songs-lyrics/songs-lyrics.module';
import { SongsInfoModule } from 'src/songs-info/songs-info.module';
import { TrackPlaylistModule } from 'src/track-playlist/track-playlist.module';
import { LinksModule } from 'src/songs-info/links/links.module';
import { TrackStatisticsModule } from 'src/songs-info/track-statistics/track-statistics.module';
import { ALBUM_TYPE } from 'src/music-services/music-service-core/types';
import UTCDate from './scalar/UTCDate';
import { UserResolver } from './user.resolver';
import { TRACK_STATUS } from './models/track.model';
import { BullModule } from '@nestjs/bull';
import { FRONTEND_QUEUE } from './constants';
import { FrontendProcessor } from './frontend.processor';
import { TelegramMainModule } from 'src/telegram/telegram.module';
import { ApolloCachePlugin } from './cache.plugin';
import { Reflector } from '@nestjs/core';
import { CLIENT_UNIQUE_PROVIDES, MUSIC_SERVICE_PROVIDERS } from 'src/constants';
import { MusicServicesModule } from 'src/music-services/music-services.module';
import { TokensPoolModule } from 'src/songs-info/tokens-pool/tokens-pool.module';
import { SoundCloudResolver } from './soundcloud.resolver';
import { DistributedSingleFlightModule } from 'src/distributed-single-flight/distributed-single-flight.module';
import { ArtistResolver } from './artist-entity.resolver';
import { PlaybackResolver } from './playback.resolver';
import { InternalMusicServiceModule } from 'src/internal-music-service/internal-music-service.module';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  AnonymousThrottlerGuard,
  AuthenticatedThrottlerGuard,
} from './decorators/gql-throttler.decorator';
import { formatError } from './utils/format-error';

registerEnumType(ALBUM_TYPE, {
  name: 'AlbumType',
});

registerEnumType(TRACK_STATUS, {
  name: 'TrackStatus',
});

registerEnumType(MUSIC_SERVICE_PROVIDERS, {
  name: 'MusicServiceProvider',
});

registerEnumType(CLIENT_UNIQUE_PROVIDES, {
  name: 'PlatformProvider',
});

@Module({
  imports: [
    // SongsLyricsModule,
    MusicServicesModule,
    SongsInfoModule,
    SongsModule,
    SongWhipModule,
    TelegramMainModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useFactory: (cache: Cache, reflector: Reflector) => ({
        autoSchemaFile: join(process.cwd(), 'schema.gql'),
        useGlobalPrefix: true,
        playground: false,
        introspection: false,
        cache: undefined,
        csrfPrevention: false,
        formatError,
        context: ({ req, res, payload }) => ({ req, res, payload }),
        resolvers: {
          UTCDate: UTCDate,
          JSON: GraphQLJSON,
        },
      }),
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): CacheManagerOptions => {
        return {
          ttl: 60000,
          stores: [
            new KeyvRedis(
              `redis://${configService.get('CACHE_HOST')}:${+configService.get(
                'CACHE_PORT',
              )}/${+configService.get('CACHE_DB')}`,
            ),
          ],
        };
      },
      inject: [ConfigService],
    }),
    TrackPlaylistModule,
    LinksModule,
    TrackStatisticsModule,
    BullModule.registerQueue({
      name: FRONTEND_QUEUE,
    }),
    TokensPoolModule,
    DistributedSingleFlightModule,
    InternalMusicServiceModule,
    ThrottlerModule,
  ],
  providers: [
    ApolloCachePlugin,
    TrackEntityResolver,
    LastPlaylistResolver,
    UserResolver,
    FrontendProcessor,
    ConfigService,
    SoundCloudResolver,
    ArtistResolver,
    PlaybackResolver,
    AuthenticatedThrottlerGuard,
    AnonymousThrottlerGuard,
  ],
})
export class GraphqlFrontendModule {}
