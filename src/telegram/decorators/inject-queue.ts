import { Inject } from '@nestjs/common';

export const InjectModuleQueue = (): ParameterDecorator =>
  Inject('TELEGRAM_MODULE_QUEUE');
