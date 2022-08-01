import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { IArtist, IExternalIds, IExternalUrls, IImage } from '../types/types';
import {
  ExternalIdsSchema,
  ExternalUrlsSchema,
  ImageSchema,
} from './common.schema';

export type ArtistDocument = Artist & Document;

@Schema({
  timestamps: true,
})
export class Artist implements IArtist {
  _id?: string;

  @Prop()
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop([String])
  genres: string[];

  @Prop(ImageSchema)
  image?: IImage;

  @Prop(ExternalUrlsSchema)
  links: IExternalUrls;

  @Prop(ExternalIdsSchema)
  ids: IExternalIds;
}

export const ArtistSchema = SchemaFactory.createForClass(Artist);
