import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request } from 'express';
import { extractAuthContextFromRequest } from 'src/auth/utils';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    return extractAuthContextFromRequest(
      GqlExecutionContext.create(ctx).getContext().req,
    );
  },
);

export const ContextResponse = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    return GqlExecutionContext.create(ctx).getContext<{ req: Request }>().req
      .res;
  },
);
