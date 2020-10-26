
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SpotifyChatPlaylistDocument = SpotifyChatPlaylist & Document;

@Schema({
  timestamps: true,
})
export class SpotifyChatPlaylist {
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

  @Prop()
  chat_id: number;
}

export const SpotifyChatPlaylistSchema = SchemaFactory.createForClass(SpotifyChatPlaylist);

SpotifyChatPlaylistSchema.index({ chat_id: 1, uri: 1 }, { unique: true });
