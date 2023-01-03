import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SongLyricDocument = SongLyric & Document;

@Schema({
  timestamps: true,
})
export class SongLyric {
  _id?: string;

  @Prop()
  id: string;

  @Prop({
    unique: true,
    type: Types.ObjectId,
    ref: 'SongWhip',
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
