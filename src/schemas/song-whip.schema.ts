import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SongWhipDocument = SongWhip & Document;

type Link = {
  link: string;
  countries: string[];
};

@Schema()
export class SongWhipLinks {
  tidal: Link[];
  itunes: Link[];
  spotify: Link[];
  youtubeMusic: Link[];
}

@Schema()
export class SongWhip {
  @Prop()
  id?: string;

  @Prop({ unique: true })
  searchTrackUrl: string;

  @Prop()
  searchCountry: string;

  @Prop()
  type: string;

  @Prop()
  sw_id: number;

  @Prop()
  path: string;

  @Prop()
  name: string;

  @Prop()
  url: string;

  @Prop()
  sourceUrl: string;

  @Prop()
  sourceCountry: string;

  @Prop()
  releaseDate: string;

  @Prop()
  createdAt: string;

  @Prop()
  updatedAt: string;

  refreshedAt: string;

  @Prop()
  image: string;

  @Prop()
  config: string;

  @Prop()
  linksCountries: string[];

  @Prop()
  artists: any[];

  @Prop({ type: SongWhipLinks })
  links: SongWhipLinks;
}

export const SongWhipSchema = SchemaFactory.createForClass(SongWhip);
