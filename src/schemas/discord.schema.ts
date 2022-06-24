import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DiscordUserDocument = DiscordUser & Document;

@Schema()
export class DiscordUser {
  @Prop()
  id: string;

  @Prop()
  user_id: string;

  @Prop({
    type: String,
    unique: true,
  })
  discord_id: string;

  @Prop()
  username: string;

  @Prop()
  language_code: string;
}

export const DiscordUserSchema = SchemaFactory.createForClass(DiscordUser);
DiscordUserSchema.index({ discord_id: 1 }, { unique: true });
