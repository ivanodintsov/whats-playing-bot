import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as queryString from 'qs';

const transformPayload = (payload: any) => {
  return Object.keys(payload)
    .map(key => `${key}=${payload[key]}`)
    .sort()
    .join('\n');
};

@Injectable()
export class TelegramAuthService {
  constructor() {
    const q =
      '';
    const token = '';
    this.checkLoginData(q, token);
  }

  checkLoginData(query: string, botToken: string) {
    const payload = queryString.parse(query);
    const secret = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const hash = payload.hash;
    delete payload.hash;

    const check = crypto
      .createHmac('sha256', secret)
      .update(transformPayload(payload))
      .digest('hex');

    return check === hash;
  }
}
