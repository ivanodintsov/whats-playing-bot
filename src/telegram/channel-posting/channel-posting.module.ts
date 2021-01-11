import { Module } from '@nestjs/common';
import { ChannelPostingService } from './channel-posting.service';

@Module({
  providers: [ChannelPostingService],
  exports: [ChannelPostingService],
})
export class ChannelPostingModule {}
