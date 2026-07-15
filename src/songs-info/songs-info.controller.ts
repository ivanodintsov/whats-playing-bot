import { InjectQueue } from '@nestjs/bull';
import { Controller, Get, Query } from '@nestjs/common';
import { Queue } from 'bull';
import { SongsService } from './songs/songs.service';
import { SONGS_INFO_QUEUE } from './constants';

@Controller('songs-info')
export class SongsInfoController {
  constructor(
    @InjectQueue(SONGS_INFO_QUEUE) private readonly songsInfoQueue: Queue,
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

  @Get('album')
  private async getAlbumByUrl(@Query('url') url: string) {
    return this.songsService.getAlbumByUrl(url);
  }

  @Get('artist')
  private async getArtistByUrl(@Query('url') url: string) {
    return this.songsService.getArtistByUrl(url);
  }

  @Get('track')
  private async getTrackByUrl(@Query('url') url: string) {
    return this.songsService.getTrackByUrl(url);
  }
}
