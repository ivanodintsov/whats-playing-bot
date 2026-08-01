import { Maybe } from 'src/typings';
import { AutherizedContext } from './types';
import { Request } from 'express';

export const extractAuthContextFromRequest = (
  req: Request,
): Maybe<AutherizedContext> => {
  if (req.user) {
    return req.user as AutherizedContext;
  }

  return null;
};
