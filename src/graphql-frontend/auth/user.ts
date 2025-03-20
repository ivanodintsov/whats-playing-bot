import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request } from 'express';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    return GqlExecutionContext.create(ctx).getContext().req.user;
  },
);

export const ContextResponse = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    return GqlExecutionContext.create(ctx).getContext<{ req: Request }>().req
      .res;
  },
);
