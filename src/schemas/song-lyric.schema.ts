import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SongLyricDocument = SongLyric & Document;

@Schema()
export class SongLyric {
  @Prop()
  id: string;

  @Prop({
    unique: true,
  })
  songId: string;

  @Prop()
  text: string;

  @Prop()
  status: string;

  @Prop()
  provider: string;
}

export const SongLyricSchema = SchemaFactory.createForClass(SongLyric);
