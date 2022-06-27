import { Injectable, Logger } from '@nestjs/common';
import { Once, On, Context, ContextOf } from 'necord';

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  @Once('ready')
  public onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`Bot logged in as ${client.user.username}`);
  }

  @On('warn')
  public onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
  }
}
