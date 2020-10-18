
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SpotifyDocument = Spotify & Document;

@Schema()
export class Spotify {
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
  userId: string;
}

export const SpotifySchema = SchemaFactory.createForClass(Spotify);
