import { CacheModule, Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { ChatPlaylistResolver } from './chat-playlist.resolver';
import { PlaylistResolver } from './last-shared.resolver';
import { SpotifyModule } from 'src/spotify/spotify.module';
import { SongWhipModule } from 'src/song-whip/song-whip.module';
import { LastPlaylistResolver } from './last-playlist.resolver';
import * as redisStore from 'cache-manager-redis-store';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { SongsModule } from 'src/views/songs/songs.module';

@Module({
  imports: [
    SongsModule,
    SongWhipModule,
    SpotifyModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      useGlobalPrefix: true,
      driver: ApolloDriver,
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
          max: 30,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [ChatPlaylistResolver, PlaylistResolver, LastPlaylistResolver],
})
export class GraphqlFrontendModule {}
