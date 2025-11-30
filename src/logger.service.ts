import { Injectable, ConsoleLogger } from '@nestjs/common';

@Injectable()
export class Logger extends ConsoleLogger {
  error(message: any, stack?: string, context?: string) {
    if (message?.code === 'ERR_HTTP_HEADERS_SENT') {
      return;
    }

    super.error(message, stack, context);
  }
}
