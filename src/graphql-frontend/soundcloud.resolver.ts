import { Args, Query, Resolver } from '@nestjs/graphql';
import { Link } from 'src/songs-info/models/link.model';
import { Inject, NotFoundException, UseGuards } from '@nestjs/common';
import { xxh3 } from '@node-rs/xxhash';
import { GqlAuthGuard } from './auth/auth.guard';
import { ContextResponse } from './auth/user';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SoundcloudService } from 'src/music-services/soundcloud-service/soundcloud-service.service';
import { SoundCloudStreamResponse } from './models/soundcloud.model';
import { TokensPoolService } from 'src/songs-info/tokens-pool/tokens-pool.service';
import { Logger } from 'src/logger.service';
import { GetSongByURLArgs } from './models/track.model';
import { Maybe } from 'src/typings';
import { SoundCloudTrackStream } from 'src/music-services/soundcloud-service/types';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

interface PlaybackSource {
  type: 'hls' | 'mp3';
  quality?: 160 | 96 | 128;
  url: string;
}

@Resolver((of) => Link)
export class SoundCloudResolver {
  private readonly logger = new Logger(SoundCloudResolver.name);

  constructor(
    private readonly appConfig: ConfigService,
    private readonly soundCloudService: SoundcloudService,
    private readonly tokenPoolService: TokensPoolService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // @UseGuards(GqlAuthGuard)
  @Query((returns) => SoundCloudStreamResponse)
  async soundCloudResolveStream(
    @ContextResponse() res: Response,
    @Args() args: GetSongByURLArgs,
  ) {
    try {
      const soundcloudTokens =
        await this.soundCloudService.findOrcreateServiceTokens();
      const token =
        await this.tokenPoolService.acquireServiceToken(soundcloudTokens);
      const connected = await this.soundCloudService.connect({ token });

      const queryHash = xxh3.xxh64(`sc:res-stream:${args.url}`).toString(16);

      const cachedStream = await this.cacheManager.get(queryHash);

      if (cachedStream) {
        return cachedStream;
      }

      return connected.using(async (service) => {
        const track = await service.resolveUrl({ url: args.url });
        const stream = await service.getTrackStream({ id: track.urn });
        const source = this._getPlaybackTypeFromStream(stream);

        if (!source) {
          throw new NotFoundException();
        }

        const streamURL = await service.resolveStreamUrl({
          url: source.url,
        });

        const response = {
          type: source.type,
          quality: source.quality,
          url: streamURL.url,
          expiresAt: streamURL.expires?.date || null,
        };

        if (streamURL.expires) {
          try {
            await this.cacheManager.set(
              queryHash,
              response,
              streamURL.expires.ttl * 1000,
            );
          } catch (error) {
            this.logger.debug(error);
          }
        }

        return response;
      });
    } catch (error) {
      this.logger.debug(error);
      throw new NotFoundException();
    }
  }

  private _getPlaybackTypeFromStream(stream: SoundCloudTrackStream) {
    let source: Maybe<PlaybackSource> = null;
    if (stream.hls_aac_160_url) {
      source = {
        type: 'hls',
        quality: 160,
        url: stream.hls_aac_160_url,
      };
    } else if (stream.hls_aac_96_url) {
      source = {
        type: 'hls',
        quality: 96,
        url: stream.hls_aac_96_url,
      };
    } else if (stream.preview_mp3_128_url) {
      source = {
        type: 'mp3',
        quality: 128,
        url: stream.preview_mp3_128_url,
      };
    }

    return source;
  }
}
