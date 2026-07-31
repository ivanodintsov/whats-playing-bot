import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { httpAgent, httpsAgent } from './shared-agents';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => {
        return {
          timeout: 10000,
          maxRedirects: 5,
          httpAgent,
          httpsAgent,
        };
      },
    }),
  ],
  exports: [HttpModule],
})
export class CustomHttpModule {}
