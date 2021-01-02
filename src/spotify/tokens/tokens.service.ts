import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { Spotify } from '../../schemas/spotify.schema';

@Injectable()
export class TokensService {
  constructor(
    @InjectQueue('spotifyTokens') private spotifyTokensQueue: Queue,
  ) {}

  processTokens (data: Spotify) {
    this.spotifyTokensQueue.add('refreshTokens', {
      _id: data._id,
    }, {
      attempts: 10,
      backoff: 90000,
      delay: data.expires_in * 1000 / 2,
      removeOnComplete: true,
    })
  }
}
