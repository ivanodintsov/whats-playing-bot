import * as crypto from 'crypto';
import {
  Injectable,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
  HttpStatus,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { GRAPHQL_CAHABLE_KEY } from '../decorators/cache.decorator';
import { Cache } from 'cache-manager';
import { lastValueFrom, of, tap } from 'rxjs';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { Response } from 'express';

@Injectable()
export class GraphQLCacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) protected readonly cache: Cache,
    private reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const start = Date.now();

    const gqlContext = GqlExecutionContext.create(context);
    const response = gqlContext.getContext().res as Response;

    const meta = this.reflector.get<{ ttl: number }>(
      GRAPHQL_CAHABLE_KEY,
      context.getHandler(),
    );

    if (!meta) return next.handle();

    const cacheKey = this.getCacheKey(context);

    if (!cacheKey) {
      return next.handle();
    }

    try {
      const cached = await this.cache.get<string | undefined>(cacheKey);

      response.setHeader('X-Cache', isNil(cached) ? 'MISS' : 'HIT');

      if (!isNil(cached)) {
        response.setHeader('X-Response-Time', `${Date.now() - start}ms`);
        response.setHeader('Content-Type', 'application/json');

        await response.status(HttpStatus.OK).send(cached);

        return of(true);
      }

      return next.handle().pipe(
        tap(async (response) => {
          if (response instanceof StreamableFile) {
            return;
          }

          const args: [string, any] = [cacheKey, JSON.stringify(response)];
          if (!isNil(meta.ttl)) {
            args.push(meta.ttl);
          }

          try {
            await this.cache.set(...args);
          } catch (err) {
            Logger.debug(
              `An error has occurred when inserting "key: ${cacheKey}", "value: ${response}"`,
              err.stack,
              'CacheInterceptor',
            );
          }
        }),
      );
    } catch {
      return next.handle();
    }
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
