import { Context as TelegrafContext } from 'nestjs-telegraf';
import { Spotify } from 'src/schemas/spotify.schema';

export interface SpotifyContext {
  tokens: Spotify;
}

export interface Context extends TelegrafContext {
  spotify?: SpotifyContext;
}
