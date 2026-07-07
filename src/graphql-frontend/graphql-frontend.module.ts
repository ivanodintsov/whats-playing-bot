import { Module } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER, CacheModule } from '@nestjs/cache-manager';
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
import { ALBUM_TYPE } from 'src/songs-info/types/parser';
import UTCDate from './scalar/UTCDate';
import { UserResolver } from './user.resolver';
import { TRACK_STATUS } from './models/track.model';
import { BullModule } from '@nestjs/bull';
import { FRONTEND_QUEUE } from './constants';
import { FrontendProcessor } from './frontend.processor';
import { TelegramMainModule } from 'src/telegram/telegram.module';
import { ApolloCachePlugin } from './cache.plugin';
import { Reflector } from '@nestjs/core';

registerEnumType(ALBUM_TYPE, {
  name: 'AlbumType',
});

registerEnumType(TRACK_STATUS, {
  name: 'TrackStatus',
});

@Module({
  imports: [
    // SongsLyricsModule,
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
        context: ({ req, res, payload }) => ({ req, res, payload }),
        resolvers: {
          UTCDate: UTCDate,
        },
      }),
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          ttl: 60000,
          max: 200,
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
  ],
  providers: [
    ApolloCachePlugin,
    TrackEntityResolver,
    LastPlaylistResolver,
    UserResolver,
    FrontendProcessor,
    ConfigService,
  ],
})
export class GraphqlFrontendModule {}
