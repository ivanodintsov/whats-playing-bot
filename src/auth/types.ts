import { User } from 'src/users/models/user.model';

export type AutherizedContext = {
  user: User;
  provider: string;
  access_token: string;
};
