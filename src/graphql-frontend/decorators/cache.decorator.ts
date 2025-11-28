import { SetMetadata } from '@nestjs/common';

export const GRAPHQL_CAHABLE_KEY = 'GRAPHQL_CAHABLE_KEY';

export const Cacheable = ({ ttl }: { ttl: number } = { ttl: 60 }) => {
  return SetMetadata(GRAPHQL_CAHABLE_KEY, { ttl });
};
