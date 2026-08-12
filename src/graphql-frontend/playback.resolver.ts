import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  BadRequestException,
  HttpException,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { ContextResponse, User } from './auth/user';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SoundcloudService } from 'src/music-services/soundcloud-service/soundcloud-service.service';
import { TokensPoolService } from 'src/songs-info/tokens-pool/tokens-pool.service';
import { Logger } from 'src/logger.service';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { DistributedSingleFlightService } from 'src/distributed-single-flight/distributed-single-flight.service';
import {
  AddToPlaybackQueue,
  AddToPlaybackQueueInput,
  ClearPlaybackQueue,
  ClearPlaybackQueueInput,
  GetPlaybackQueueInput,
  PlaybackEntity,
  PlaybackQueue,
  RemoveFromPlaybackQueueByIndex,
  RemoveFromPlaybackQueueInput,
  SkipPlaybackQueueToIndex,
  SkipPlaybackQueueToIndexInput,
} from './models/playback.model';
import { InternalMusicPlaybackQueueService } from 'src/internal-music-service/internal-music-playback-queue/internal-music-playback-queue.service';
import { MUSIC_SERVICE_PROVIDERS } from 'src/constants';
import { AutherizedContext } from 'src/auth/types';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';
import { InjectModel } from '@nestjs/sequelize';
import { ThrottlerGqlAuth } from './throttler/guards/throttler-gql-auth';

@Resolver((of) => PlaybackEntity)
export class PlaybackResolver {
  private readonly logger = new Logger(PlaybackResolver.name);

  constructor(
    private readonly appConfig: ConfigService,
    private readonly playbackQueueService: InternalMusicPlaybackQueueService,
    private readonly soundCloudService: SoundcloudService,
    private readonly tokenPoolService: TokensPoolService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly singleFlightService: DistributedSingleFlightService,

    @InjectModel(TelegramUser)
    private readonly platformUser: typeof TelegramUser,
  ) {}

  @ThrottlerGqlAuth(10)
  @Query((returns) => PlaybackQueue)
  async getPlaybackQueue(
    @ContextResponse() res: Response,
    @User() user: AutherizedContext,
    @Args('getPlaybackQueueData')
    getPlaybackQueueData: GetPlaybackQueueInput,
  ) {
    if (getPlaybackQueueData.service !== MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD) {
      throw new BadRequestException();
    }

    try {
      const platformUser = await this.platformUser.findOne({
        where: {
          userId: user.user.id,
          // TODO
          // provider: provider
        },
        attributes: ['id'],
      });

      const response = await this.playbackQueueService.getQueue({
        service: getPlaybackQueueData.service,
        providerUserId: platformUser.id,
      });

      return response;
    } catch (error) {
      this.logger.debug(error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException();
    }
  }

  @ThrottlerGqlAuth(15)
  @Mutation((returns) => AddToPlaybackQueue, { nullable: true })
  async addToPlaybackQueue(
    @ContextResponse() res: Response,
    @User() user: AutherizedContext,
    @Args('addToPlaybackQueueData')
    addToPlaybackQueueData: AddToPlaybackQueueInput,
  ) {
    if (
      addToPlaybackQueueData.service !== MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD ||
      !addToPlaybackQueueData.tracks.length
    ) {
      throw new BadRequestException();
    }

    try {
      const platformUser = await this.platformUser.findOne({
        where: {
          userId: user.user.id,
          // TODO
          // provider: provider
        },
        attributes: ['id'],
      });

      await this.playbackQueueService.addToQueue(
        {
          service: addToPlaybackQueueData.service,
          providerUserId: platformUser.id,
        },
        addToPlaybackQueueData.tracks,
      );
    } catch (error) {
      this.logger.debug(error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException();
    }
  }

  @ThrottlerGqlAuth(20)
  @Mutation((returns) => RemoveFromPlaybackQueueByIndex)
  async removeFromPlaybackQueue(
    @ContextResponse() res: Response,
    @User() user: AutherizedContext,
    @Args('removeFromPlaybackQueueData')
    removeFromPlaybackQueueData: RemoveFromPlaybackQueueInput,
  ) {
    if (
      removeFromPlaybackQueueData.service !== MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD
    ) {
      throw new BadRequestException();
    }

    try {
      const platformUser = await this.platformUser.findOne({
        where: {
          userId: user.user.id,
          // TODO
          // provider: provider
        },
        attributes: ['id'],
      });

      const response = await this.playbackQueueService.removeByIndex(
        {
          service: removeFromPlaybackQueueData.service,
          providerUserId: platformUser.id,
        },
        removeFromPlaybackQueueData.index,
      );

      return {
        id: response.id,
      };
    } catch (error) {
      this.logger.debug(error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException();
    }
  }

  @ThrottlerGqlAuth(10)
  @Mutation((returns) => SkipPlaybackQueueToIndex)
  async skipPlaybackQueueToIndex(
    @ContextResponse() res: Response,
    @User() user: AutherizedContext,
    @Args('skipPlaybackQueueToIndexData')
    skipPlaybackQueueToIndexData: SkipPlaybackQueueToIndexInput,
  ) {
    if (
      skipPlaybackQueueToIndexData.service !==
      MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD
    ) {
      throw new BadRequestException();
    }

    try {
      const platformUser = await this.platformUser.findOne({
        where: {
          userId: user.user.id,
          // TODO
          // provider: provider
        },
        attributes: ['id'],
      });

      const response = await this.playbackQueueService.skipToIndex(
        {
          service: skipPlaybackQueueToIndexData.service,
          providerUserId: platformUser.id,
        },
        skipPlaybackQueueToIndexData.index,
      );

      return {
        id: response.id,
      };
    } catch (error) {
      this.logger.debug(error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException();
    }
  }

  @ThrottlerGqlAuth(5)
  @Mutation((returns) => ClearPlaybackQueue)
  async clearPlaybackQueue(
    @ContextResponse() res: Response,
    @User() user: AutherizedContext,
    @Args('clearPlaybackQueueData')
    clearPlaybackQueueData: ClearPlaybackQueueInput,
  ) {
    if (clearPlaybackQueueData.service !== MUSIC_SERVICE_PROVIDERS.SOUNDCLOUD) {
      throw new BadRequestException();
    }

    const platformUser = await this.platformUser.findOne({
      where: {
        userId: user.user.id,
        // TODO
        // provider: provider
      },
      attributes: ['id'],
    });

    const response = await this.playbackQueueService.clearQueue({
      service: clearPlaybackQueueData.service,
      providerUserId: platformUser.id,
    });

    return {
      success: true,
    };
  }
}
