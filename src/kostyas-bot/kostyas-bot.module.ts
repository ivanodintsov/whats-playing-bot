import { HttpModule, Module } from '@nestjs/common';
import { KostyasBotService } from './kostyas-bot.service';

@Module({
  imports: [HttpModule],
  providers: [KostyasBotService],
  exports: [KostyasBotService],
})
export class KostyasBotModule {}
