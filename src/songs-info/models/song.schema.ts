import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { ISong, SONG_TYPE } from '../types/parser';
import { Artist } from './artist.model';
import { IArtist, IExternalIds, IExternalUrls } from '../types/parser';
import { ExternalIdsSchema, ExternalUrlsSchema } from './common.schema';
import { Album } from './album.model';

export type SongDocument = Song & Document;

@Schema({
  timestamps: true,
})
export class Song implements Omit<ISong, 'artists' | 'album'> {
  _id?: string;

  @Prop()
  id: string;

  @Prop()
  name: string;

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

  @Prop(String)
  isrc: string[];

  @Prop(String)
  upc: string[];

  @Prop(String)
  ean: string[];

  @Prop([String])
  commongIsrcs: string[];

  @Prop({ type: { type: mongoose.Schema.Types.ObjectId, ref: 'Album' } })
  album: string;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artist' }] })
  artists: string[];

  @Prop()
  explicit: boolean;

  @Prop()
  duration: number;

  @Prop({ type: Types.ObjectId })
  oldId: string;

  @Prop({ type: Types.ObjectId, ref: 'SongLyric' })
  lyricsId: string;
}

export const SongSchema = SchemaFactory.createForClass(Song);
