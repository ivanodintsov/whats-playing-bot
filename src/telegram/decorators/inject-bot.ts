import { Inject } from '@nestjs/common';

export const InjectModuleBot = (): ParameterDecorator =>
  Inject('TELEGRAM_MODULE_BOT');
