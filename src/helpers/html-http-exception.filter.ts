import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import * as escapeHtml from 'escape-html';

@Catch(HttpException)
export class HtmlHttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let safeMessage = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        safeMessage = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resp = exceptionResponse as any;

        if (Array.isArray(resp.message)) {
          safeMessage = resp.message.join(', ');
        } else if (typeof resp.message === 'string') {
          safeMessage = resp.message;
        }
      }

      if (status >= 500) {
        safeMessage = 'Internal server error';
      }
    }

    return response.status(status).render('errors/index', {
      message: escapeHtml(safeMessage),
      status,
    });
  }
}
