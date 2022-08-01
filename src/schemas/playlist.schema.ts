import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SpotifyPlaylistDocument = SpotifyPlaylist & Document;

@Schema({
  timestamps: true,
})
export class SpotifyPlaylist {
  _id?: string;

  @Prop()
  id?: string;

  @Prop()
  name: string;

  @Prop()
  artists: string;

  @Prop()
  url: string;

  @Prop()
  uri: string;

  @Prop()
  image: string;

  @Prop()
  spotifyImage: string;

  @Prop({
    type: String,
    cast: (v: string | number) => {
      return `${v}`;
    },
  })
  chat_id: number | string;

  @Prop()
  tg_user_id: number;
}

export const SpotifyPlaylistSchema = SchemaFactory.createForClass(
  SpotifyPlaylist,
);

SpotifyPlaylistSchema.index(
  { tg_user_id: 1, chat_id: 1, uri: 1 },
  { unique: true },
);
SpotifyPlaylistSchema.index({ tg_user_id: 1, uri: 1 }, { unique: true });
