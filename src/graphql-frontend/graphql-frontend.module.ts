import { CacheModule, Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { ChatPlaylistResolver } from './chat-playlist.resolver';
import { PlaylistResolver } from './last-shared.resolver';
import { SpotifyModule } from 'src/spotify/spotify.module';
import { SongWhipModule } from 'src/song-whip/song-whip.module';
import { LastPlaylistResolver } from './last-playlist.resolver';
import * as redisStore from 'cache-manager-redis-store';

@Module({
  imports: [
    SongWhipModule,
    SpotifyModule,
    GraphQLModule.forRoot({
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      useGlobalPrefix: true,
    }),
    CacheModule.register({
      store: redisStore,
      host: 'datatracker-redis',
      port: 6379,
      db: 1,
      ttl: 15,
      max: 30,
    }),
  ],
  providers: [
    ChatPlaylistResolver,
    PlaylistResolver,
    LastPlaylistResolver,
  ]
})
export class GraphqlFrontendModule {}
