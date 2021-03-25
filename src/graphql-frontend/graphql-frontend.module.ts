import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { ChatPlaylistResolver } from './chat-playlist.resolver';
import { PlaylistResolver } from './last-shared.resolver';
import { SpotifyModule } from 'src/spotify/spotify.module';
import { SongWhipModule } from 'src/song-whip/song-whip.module';

@Module({
  imports: [
    SongWhipModule,
    SpotifyModule,
    GraphQLModule.forRoot({
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      useGlobalPrefix: true,
    }),
  ],
  providers: [
    ChatPlaylistResolver,
    PlaylistResolver,
  ]
})
export class GraphqlFrontendModule {}
