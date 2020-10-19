
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SpotifyDocument = Spotify & Document;

@Schema({
  timestamps: true,
})
export class Spotify {
  _id: string;

  @Prop()
  id: string;

  @Prop()
  access_token: string;

  @Prop()
  refresh_token: string;

  @Prop()
  token_type: string;

  @Prop()
  expires_in: number;

  @Prop()
  scope: string;

  @Prop()
  user_id: string;

  @Prop()
  tg_id: string;
}

export const SpotifySchema = SchemaFactory.createForClass(Spotify);
