import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getLyrics } from 'genius-lyrics-api';

export const GENIUS_SERVICE = 'GENIUS_SERVICE';

export type GeniusClient = {
  getLyrics: (options: Omit<options, 'apiKey'>) => string;
};

type options = {
  title: string;
  artist: string;
  apiKey: string;
  optimizeQuery?: boolean;
  authHeader?: boolean;
};

export const GeniusService: FactoryProvider = {
  provide: GENIUS_SERVICE,
  inject: [ConfigService],
  useFactory: async (appConfig: ConfigService) => {
    const apiKey = appConfig.get<string>('GENIUS_API_KEY');

    return {
      getLyrics: (options: options) => {
        return getLyrics({
          ...options,
          optimizeQuery: false,
          apiKey,
        });
      },
    };
  },
};
