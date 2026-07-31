import { RequestWithUser } from './types';

export const extractAuthContextFromRequest = (req: RequestWithUser) => {
  return req.user;
};
