
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TelegramUserDocument = TelegramUser & Document;

@Schema()
export class TelegramUser {
  @Prop()
  id: string;

  @Prop()
  user_id: string;

  @Prop({
    unique: true,
  })
  tg_id: number;

  @Prop()
  first_name: string;

  @Prop()
  last_name: string;

  @Prop()
  username: string;

  @Prop()
  language_code: string;
}

export const TelegramUserSchema = SchemaFactory.createForClass(TelegramUser);
