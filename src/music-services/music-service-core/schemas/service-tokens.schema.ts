import { Prop } from '@nestjs/mongoose';
import { DiscordUser, TelegramUser } from '../music-service-core.service';

export class ServiceTokens implements TelegramUser, DiscordUser {
  _id: string;

  @Prop()
  id: string;

  @Prop()
  access_token: string;

  @Prop()
  refresh_token: string;

  @Prop()
  token_type: string;

  @Prop()
  expires_in: number;

  @Prop({
    default: 0,
  })
  expires_date: number;

  @Prop()
  scope: string;

  @Prop()
  user_id: string;

  @Prop()
  tg_id: number;

  @Prop()
  discord_id: string;
}
