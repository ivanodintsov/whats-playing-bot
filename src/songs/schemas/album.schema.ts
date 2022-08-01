import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  ALBUM_TYPE,
  IAlbum,
  IExternalIds,
  IExternalUrls,
  IImage,
  RELEASE_DATE_PRECISION,
} from '../types/types';
import {
  ExternalIdsSchema,
  ExternalUrlsSchema,
  ImageSchema,
} from './common.schema';

export type AlbumDocument = Album & Document;

@Schema({
  timestamps: true,
})
export class Album implements IAlbum {
  _id?: string;

  @Prop()
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({
    type: String,
    enum: ALBUM_TYPE,
  })
  albumType: ALBUM_TYPE;

  @Prop([String])
  availableMarkets: string[];

  @Prop()
  totalTracks: number;

  @Prop(ExternalUrlsSchema)
  links: IExternalUrls;

  @Prop(ExternalIdsSchema)
  ids: IExternalIds;

  @Prop(ImageSchema)
  image: IImage;

  @Prop()
  releaseDate: string;

  @Prop({
    type: String,
    enum: RELEASE_DATE_PRECISION,
  })
  releaseDatePrecision: RELEASE_DATE_PRECISION;
}

export const AlbumSchema = SchemaFactory.createForClass(Album);
