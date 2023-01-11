import { Controller, Post, Body } from '@nestjs/common';
import { SongsLyricsService } from './songs-lyrics.service';
import { TrackData } from './track-lyrics/track-lyrics.service';

@Controller('songs-lyrics')
export class SongsLyricsController {
  constructor(private readonly songsLyricsService: SongsLyricsService) {}

  @Post('add-track')
  async addUrlToQueue(@Body() bodyData: TrackData) {
    await this.songsLyricsService.addTrackToQueue(bodyData);
  }
}
