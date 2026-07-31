import { HttpAgent, HttpsAgent } from 'agentkeepalive';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { SongWhipService } from './song-whip.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => {
        return {
          timeout: 60000,
          maxRedirects: 5,
          httpAgent: new HttpAgent({
            keepAlive: true,
            keepAliveMsecs: 1000,
            maxSockets: 50,
            maxFreeSockets: 10,
            freeSocketTimeout: 30000,
            timeout: 60000,
          }),
          httpsAgent: new HttpsAgent({
            keepAlive: true,
            keepAliveMsecs: 1000,
            maxSockets: 50,
            maxFreeSockets: 10,
            freeSocketTimeout: 30000,
            timeout: 60000,
          }),
        };
      },
    }),
  ],
  providers: [SongWhipService],
  exports: [SongWhipService],
})
export class SongWhipModule {}
