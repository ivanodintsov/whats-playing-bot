import { Inject } from '@nestjs/common';
import { getGA4Name } from '../utils';

export const InjectGA4 = (botName?: string): ParameterDecorator =>
  Inject(getGA4Name(botName));
