import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { MusicServiceToken } from 'src/music-service/models/music-service-token.model';

@Injectable()
export class TokensService {
  constructor(
    @InjectQueue('spotifyTokens') private spotifyTokensQueue: Queue,
  ) {}

  processTokens(data: MusicServiceToken) {
    this.spotifyTokensQueue.add(
      'refreshTokens',
      {
        id: data.id,
      },
      {
        attempts: 10,
        backoff: 90000,
        delay: (data.expires_in * 1000) / 2,
        removeOnComplete: true,
      },
    );
  }
}
