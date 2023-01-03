import { raw } from '@nestjs/mongoose';
import { IExternal } from '../types/parser';

export const ExternalIdsSchema = raw({
  spotify: raw({
    id: { type: String },
  }),
} as IExternal<{
  id: any;
}>);

export const ExternalUrlsSchema = raw({
  spotify: raw({
    url: { type: String },
  }),
} as IExternal<{
  url: any;
}>);

export const ImageSchema = raw({
  height: { type: Number },
  width: { type: Number },
  url: { type: String },
});
