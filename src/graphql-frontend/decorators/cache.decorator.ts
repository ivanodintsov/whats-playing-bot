import { SetMetadata, applyDecorators, UseInterceptors } from '@nestjs/common';
import { GraphQLCacheInterceptor } from '../interceptors/cache.interceptor';

export const GRAPHQL_CAHABLE_KEY = 'GRAPHQL_CAHABLE_KEY';

export const Cacheable = ({ ttl }: { ttl: number } = { ttl: 60000 }) => {
  return SetMetadata(GRAPHQL_CAHABLE_KEY, { ttl });
};

export const UseCacheable = (params: { ttl: number } = { ttl: 60000 }) => {
  return applyDecorators(
    Cacheable(params),
    UseInterceptors(GraphQLCacheInterceptor),
  );
};
