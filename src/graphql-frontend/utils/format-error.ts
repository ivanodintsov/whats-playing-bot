import { HttpException } from '@nestjs/common';
import { GraphQLFormattedError } from 'graphql';
import { GraphQLError } from 'graphql/error';
import { NoMusicServiceError } from 'src/errors';

export const formatError = (
  formattedError: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError => {
  const originalError = getOriginalError(error);
  let statusCode = getStatusCode(originalError);
  let message = formattedError.message;

  const code = getGraphQLErrorCode(statusCode, formattedError, originalError);
  statusCode = getGraphQLErrorStatusCode(
    statusCode,
    formattedError,
    originalError,
  );

  const extensions: any = {
    code,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  return {
    ...formattedError,
    message,
    extensions,
  };
};

const getOriginalError = (error: unknown): unknown => {
  if (error instanceof GraphQLError && error.originalError) {
    return error.originalError;
  }

  return error;
};

const getStatusCode = (error: unknown): number => {
  if (error instanceof HttpException) {
    return error.getStatus();
  }
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as any).status;
  }
  return 500;
};

const getGraphQLErrorStatusCode = (
  status: number,
  formattedError: any,
  originalError: any,
): number => {
  if (originalError instanceof NoMusicServiceError) {
    return 401;
  }

  if (originalError instanceof HttpException) {
    return originalError.getStatus();
  }

  return status;
};

const getGraphQLErrorCode = (
  status: number,
  formattedError: any,
  originalError: any,
): string => {
  if (
    formattedError.extensions?.code &&
    formattedError.extensions.code !== 'INTERNAL_SERVER_ERROR'
  ) {
    return formattedError.extensions.code;
  }

  if (originalError instanceof NoMusicServiceError) {
    return 'NO_MUSIC_SERVICE';
  }

  const codeMap: Record<number, string> = {
    400: 'BAD_USER_INPUT',
    401: 'UNAUTHENTICATED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    429: 'TOO_MANY_REQUESTS',
  };

  return codeMap[status] || 'INTERNAL_SERVER_ERROR';
};
