import * as crypto from 'crypto';
import {
  ApolloServerPlugin,
  HeaderMap,
  GraphQLRequestListener,
} from '@apollo/server';
import { GraphQLRequestContext } from '@apollo/server';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { Reflector } from '@nestjs/core';
import { FieldNode, SelectionNode } from 'graphql';
import { GRAPHQL_CAHABLE_KEY } from './decorators/cache.decorator';
import { Cache } from 'cache-manager';
import { Plugin } from '@nestjs/apollo';
import { HttpStatus, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Response } from 'express';
import { GraphQLCacheHitException } from './cache.exception';

function isFieldNode(node: SelectionNode): node is FieldNode {
  return node.kind === 'Field';
}

export interface CacheableOptions {
  ttl?: number;
}

export const CacheableRegistry = new Map<string, CacheableOptions>();

export function Cacheable(options: CacheableOptions = {}): MethodDecorator {
  return (target, propertyKey) => {
    const methodName = propertyKey.toString();
    CacheableRegistry.set(methodName, options);
  };
}

@Plugin()
export class ApolloCachePlugin implements ApolloServerPlugin {
  constructor(@Inject(CACHE_MANAGER) protected readonly cache: Cache) {}

  async requestDidStart(
    ctx: GraphQLRequestContext<any>,
  ): Promise<GraphQLRequestListener<any>> {
    ctx.contextValue._start = Date.now();

    return {
      didResolveOperation: async (ctx: GraphQLRequestContext<any>) => {
        const res = ctx.contextValue.res as Response;

        const selection = ctx.operation?.selectionSet?.selections?.[0];
        if (!selection || !isFieldNode(selection)) {
          return null;
        }

        const fieldName = selection.name.value;

        const resolverMeta = CacheableRegistry.get(fieldName) as
          | CacheableOptions
          | undefined;

        if (!resolverMeta) {
          return null;
        }

        const cacheKey = this.createCacheKey(ctx);

        const cached = await this.cache.get<any>(cacheKey);

        if (!isNil(cached)) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader(
            'X-Response-Time',
            `${Date.now() - ctx.contextValue._start}ms`,
          );
          res.setHeader('X-Cache', 'HIT');

          ctx.contextValue._fromCache = true;

          await res.status(HttpStatus.OK).end(cached);

          throw new GraphQLCacheHitException();
        }

        return null;
      },

      willSendResponse: async (ctx) => {
        const headers = ctx.response.http?.headers || new HeaderMap();

        headers.set(
          'X-Response-Time',
          `${Date.now() - ctx.contextValue._start}ms`,
        );
        headers.set('X-Cache', ctx.contextValue._fromCache ? 'HIT' : 'MISS');

        ctx.response.http = { headers };

        if (ctx.contextValue._fromCache) {
          return;
        }

        const selection = ctx.operation?.selectionSet?.selections?.[0];
        if (!selection || !isFieldNode(selection)) {
          return null;
        }

        const fieldName = selection.name.value;

        const resolverMeta = CacheableRegistry.get(fieldName) as
          | CacheableOptions
          | undefined;

        if (!resolverMeta) {
          return null;
        }

        if (ctx.response.body.kind === 'single') {
          const cacheKey = this.createCacheKey(ctx);

          const args: [string, any] = [
            cacheKey,
            JSON.stringify(ctx.response.body.singleResult),
          ];
          if (!isNil(resolverMeta.ttl)) {
            args.push(resolverMeta.ttl);
          }

          await this.cache.set(...args);
        }
      },
    };
  }

  private createCacheKey(ctx: GraphQLRequestContext<any>) {
    const req = ctx.request;
    const { query, variables, operationName } = req;

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
