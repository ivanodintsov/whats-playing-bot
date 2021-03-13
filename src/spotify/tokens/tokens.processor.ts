import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { SpotifyService } from '../spotify.service';
import { TokensService } from './tokens.service';

@Processor('spotifyTokens')
export class TokensProcessor {
  constructor(
    private readonly spotifyService: SpotifyService,
    private readonly tokens: TokensService,
  ) {}

  @Process({
    name: 'refreshTokens',
    concurrency: 2,
  })
  async refreshTokens(job: Job) {
    const tokens = await this.spotifyService.updateTokens(job.data);
    // this.tokens.processTokens(tokens);
    console.log(
      `Processing job ${job.id} of type ${job.name} with data ${JSON.stringify(job.data)}...`,
    );
  }
}
