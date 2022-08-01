import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Artist } from './artist.schema';
import { ISong, SONG_TYPE, IExternalIds, IExternalUrls } from '../types/types';
import { ExternalIdsSchema, ExternalUrlsSchema } from './common.schema';
import { Album } from './album.schema';

export type SongDocument = Song & Document;

@Schema({
  timestamps: true,
})
export class Song implements ISong {
  _id?: string;

  @Prop()
  id: string;

  @Prop()
  name: string;

  @Prop({
    type: String,
    required: true,
    index: true,
    unique: true,
  })
  isrc: string;

  @Prop({
    type: String,
    enum: SONG_TYPE,
  })
  type: SONG_TYPE;

  @Prop()
  trackNumber: number;

  @Prop(ExternalUrlsSchema)
  links: IExternalUrls;

  @Prop(ExternalIdsSchema)
  ids: IExternalIds;

  @Prop({ type: { type: mongoose.Schema.Types.ObjectId, ref: 'Album' } })
  album: Album;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artist' }] })
  artists: Artist[];
}

export const SongSchema = SchemaFactory.createForClass(Song);
