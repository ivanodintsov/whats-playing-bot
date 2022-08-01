import { raw } from '@nestjs/mongoose';
import { IExternal } from '../types/types';

export const ExternalIdsSchema = raw({
  spotify: raw({
    id: {
      type: String,
      index: true,
      sparse: true,
      unique: true,
    },
  }),
  youtube: raw({
    id: {
      type: String,
      index: true,
      sparse: true,
      unique: true,
    },
  }),
  youtubeMusic: raw({
    id: {
      type: String,
      index: true,
      sparse: true,
      unique: true,
    },
  }),
  qobuz: raw({
    id: {
      type: String,
      index: true,
      sparse: true,
      unique: true,
    },
  }),
  tidal: raw({
    id: {
      type: String,
      index: true,
      sparse: true,
      unique: true,
    },
  }),
  amazon: raw({
    id: {
      type: String,
      index: true,
      sparse: true,
      unique: true,
    },
  }),
  deezer: raw({
    id: {
      type: String,
      index: true,
      sparse: true,
      unique: true,
    },
  }),
  itunes: raw({
    id: {
      type: String,
      index: true,
      sparse: true,
      unique: true,
    },
  }),
} as IExternal<{
  id: any;
}>);

export const ExternalUrlsSchema = raw({
  spotify: raw({
    url: { type: String },
  }),
  youtube: raw({
    url: { type: String },
  }),
  youtubeMusic: raw({
    url: { type: String },
  }),
  qobuz: raw({
    url: { type: String },
  }),
  tidal: raw({
    url: { type: String },
  }),
  amazon: raw({
    url: { type: String },
  }),
  deezer: raw({
    url: { type: String },
  }),
  itunes: raw({
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
