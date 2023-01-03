import { InjectQueue } from '@nestjs/bull';
import { Controller, Get, Query } from '@nestjs/common';
import { Queue } from 'bull';
import { SongsService } from './songs/songs.service';

@Controller('songs-info')
export class SongsInfoController {
  constructor(
    @InjectQueue('songsInfoQueue') private readonly songsInfoQueue: Queue,
    private readonly songsService: SongsService,
  ) {}

  @Get()
  private async createLinks(@Query('url') url: string) {
    const job = await this.songsInfoQueue.add(
      'processSong',
      { url },
      {
        attempts: 1,
        removeOnComplete: true,
      },
    );

    return await job.finished();
  }

  @Get('url')
  private async getByUrl(@Query('url') url: string) {
    return this.songsService.getByUrl(url);
  }
}
