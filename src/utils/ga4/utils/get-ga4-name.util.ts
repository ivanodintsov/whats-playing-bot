import { DEFAULT_GA4_NAME } from '../constants';

export const getGA4Name = (name?: string) => {
  return name && name !== DEFAULT_GA4_NAME ? `${name}_GA4` : DEFAULT_GA4_NAME;
};
