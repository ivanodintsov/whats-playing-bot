import { Inject } from '@nestjs/common';

/**
 * Injects Bull's queue instance with the given name
 * @param name queue name
 */
export const InjectModuleQueue = (): ParameterDecorator =>
  Inject('TELEGRAM_MODULE_QUEUE');
