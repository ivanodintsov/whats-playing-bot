import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ServiceTokens } from 'src/music-services/music-service-core/schemas/service-tokens.schema';

export type DeezerTokensDocument = DeezerTokens & Document;

@Schema({
  timestamps: true,
})
export class DeezerTokens extends ServiceTokens {}

export const DeezerTokensSchema = SchemaFactory.createForClass(DeezerTokens);
