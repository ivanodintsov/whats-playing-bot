import { staticPrefix } from 'src/constants';

export const assets = () => src => {
  return `${staticPrefix}${src}`;
};
