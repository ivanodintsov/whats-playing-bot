import * as crypto from 'crypto';
import {
  Injectable,
  ExecutionContext,
  CallHandler,
  Inject,
  HttpStatus,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { GRAPHQL_CAHABLE_KEY } from '../decorators/cache.decorator';
import { Cache } from 'cache-manager';
import { lastValueFrom, of } from 'rxjs';

@Injectable()
export class GraphQLCacheInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const start = Date.now();

    const gqlContext = GqlExecutionContext.create(context);
    const response = gqlContext.getContext().res;

    const meta = this.reflector.get<{ ttl: number }>(
      GRAPHQL_CAHABLE_KEY,
      context.getHandler(),
    );

    if (!meta) return next.handle();

    const cacheKey = this.getCacheKey(context);

    if (!cacheKey) {
      return next.handle();
    }

    const cached = await this.cache.get<string | undefined>(cacheKey);

    if (cached) {
      response.setHeader('X-Response-Time', `${Date.now() - start}ms`);
      response.setHeader('X-Cache', 'HIT');
      response.setHeader('Content-Type', 'application/json');

      response.status(HttpStatus.OK).send(cached);

      return of(true);
    }

    const observable = next.handle();

    const data = await lastValueFrom(observable);

    if (data) {
      await this.cache.set<string>(cacheKey, JSON.stringify(data), meta.ttl);
    }

    response.setHeader('X-Response-Time', `${Date.now() - start}ms`);

    return of(data);
  }

  private getCacheKey(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;

    const { query, variables, operationName } = req.body;

    if (!query && !variables) {
      return null;
    }

    try {
      const queryString = query
        ? JSON.stringify(query)
            .replace(/([\s\n\r\t]+|#[^\n]*)/g, '')
            .trim()
        : '';
      const variablesString = variables
        ? JSON.stringify(variables)
            .replace(/([\s\n\r\t]+|#[^\n]*)/g, '')
            .trim()
        : '';

      const keyHash = crypto
        .createHash('md5')
        .update(`${operationName}:${queryString}:${variablesString}`)
        .digest('hex');

      return `gql:${keyHash}`;
    } catch (error) {
      return null;
    }
  }
}
