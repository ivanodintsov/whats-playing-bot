import { Strategy } from 'passport-strategy';
import {
  PassportTelegramUser,
  TelegramOptions,
  TelegramUser,
  VerifyCallback,
} from './types';
import deferPromise from './deferPromise';
import * as queryString from 'qs';
import { Request } from 'express';

export function normalizeProfile(profile: TelegramUser): PassportTelegramUser {
  const normalizedProfile: PassportTelegramUser = {
    ...profile,
    provider: 'telegram',
    user: {
      ...(profile.user
        ? JSON.parse(profile.user)
        : {
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            photo_url: profile.photo_url,
            username: profile.username,
          }),
    },
  };

  return normalizedProfile;
}

export const defaultOptions: TelegramOptions = {
  queryExpiration: 86400,
  passReqToCallback: false,
};

export const whitelistParams = [
  'first_name',
  'last_name',
  'username',
  'photo_url',
  'auth_date',
];

export class TelegramBaseStrategy extends Strategy {
  readonly name: string = 'telegram';

  readonly options: TelegramOptions;

  protected readonly verify;

  protected hashedBotToken: Buffer;

  constructor(options: TelegramOptions, verify: VerifyCallback) {
    super();

    this.options = defaultOptions;
    if (!verify) {
      throw new TypeError('LocalStrategy requires a verify callback');
    }

    this.options = {
      ...defaultOptions,
      ...options,
    };

    this.verify = verify;
  }

  authenticate(req: Request, options?: any) {
    let query =
      req.method === 'GET'
        ? (req.query.variables as any)?.initData
        : req.body.variables?.initData;

    try {
      query = queryString.parse(query);

      const validationResult = this.validateQuery(req);

      if (validationResult !== true) {
        return validationResult;
      }

      const profile = normalizeProfile(query);
      const promise = deferPromise();

      if (this.options.passReqToCallback) {
        this.verify(req, profile, promise.callback);
      } else {
        this.verify(profile, promise.callback);
      }

      promise
        .then(([user, info]) => {
          if (!user) {
            return this.fail(info);
          }

          return this.success(user, info);
        })
        .catch(err => {
          return this.error(err);
        });
    } catch (e) {
      return this.error(e);
    }
  }

  protected getTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }

  protected getBotToken(): Buffer {
    throw new Error();
  }

  protected validateQuery(req: Request): boolean | void {
    throw new Error();
  }
}
