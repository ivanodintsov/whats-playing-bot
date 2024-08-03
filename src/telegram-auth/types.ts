import { Request } from 'express';

export interface TelegramOptions {
  // An unique token which you can get from @BotFather
  botToken?: string;
  // Max seconds expiration. Default is 86400
  queryExpiration?: number;
  // Should pass express req as first argument if true
  passReqToCallback?: boolean;
}

// Typical query received to redirectUrl
export interface TelegramUser {
  auth_date: number;
  hash: string;
  user: string;
}

// Normalized profile: http://www.passportjs.org/docs/profile/
// With intent to make this backwards compatible we clone the original data format
export type PassportTelegramUser = TelegramUser & {
  provider: 'telegram';
  user: {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    language_code: string;
    is_premium: boolean;
    allows_write_to_pm: boolean;
    // photos: Array<{
    //   value: string;
    // }>;
  };
};

export type DoneCallback = (err: any, user: any, info: any) => void;

export type CallbackWithRequest = (
  req: Request,
  user: PassportTelegramUser,
  done: DoneCallback,
) => void;
export type CallbackWithoutRequest = (
  user: PassportTelegramUser,
  done: DoneCallback,
) => void;

export type VerifyCallback = CallbackWithRequest | CallbackWithoutRequest;
