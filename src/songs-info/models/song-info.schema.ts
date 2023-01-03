
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SongInfoDocument = SongInfo & Document;

@Schema({
  timestamps: true,
})
export class SongInfo {
  _id?: string;

  @Prop()
  id?: string;

  @Prop()
  uri: string;

  @Prop({
    default: 1,
  })
  shareCount: number;
}

export const SongInfoSchema = SchemaFactory.createForClass(SongInfo);

SongInfoSchema.index({ uri: 1 }, { unique: true });
