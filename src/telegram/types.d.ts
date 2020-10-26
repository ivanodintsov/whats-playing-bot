import { Context as TelegrafContext } from 'nestjs-telegraf';
import { Spotify } from 'src/schemas/spotify.schema';

export interface SpotifyContext {
  tokens: Spotify;
}

export interface Context extends TelegrafContext {
  spotify?: SpotifyContext;
}

export interface SongWhip {
  links?: any[];
  image?: string;
}

export interface CurrentTrack {
  title: string;
  name: string;
  artists: string;
  url: string;
  thumb_url: string;
  thumb_width: number;
  thumb_height: number;
  message_text: string;
  parse_mode: string;
  uri: string;
}