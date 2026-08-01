import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { xxh3 } from '@node-rs/xxhash';
import { QueryTypes, Transaction, Transactionable } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { PlaybackQueue } from './internal-music-playback-queue.model';
import {
  AddedToQueueReturnType,
  FindPlaybackQueueOptions,
  GetQueueReturnType,
  PlaybackTrack,
  RemoveByIndexReturnType,
  SkipQueueToIndexReturnType,
} from './types';
import { Logger } from 'src/logger.service';
import { INTERNAL_MUSIC_SERVICE_NAME } from 'src/constants';

@Injectable()
export class InternalMusicPlaybackQueueService {
  private logger = new Logger(InternalMusicPlaybackQueueService.name);

  constructor(
    @InjectModel(PlaybackQueue)
    private readonly playbackQueueModel: typeof PlaybackQueue,

    @Inject(Sequelize)
    private readonly sequelize: Sequelize,
  ) {}

  private QUEUE_LIMIT = 200;

  async addToQueue(
    options: FindPlaybackQueueOptions,
    tracks: PlaybackTrack[],
  ): Promise<AddedToQueueReturnType> {
    const transaction = await this.sequelize.transaction();

    try {
      await this.lockQueue(options, { transaction });

      let queue = await this.playbackQueueModel.findOne({
        where: {
          providerUserId: options.providerUserId,
          service: options.service,
        },
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });

      let currentQueue = queue?.queueList || [];
      const mergedQueue = [...currentQueue, ...tracks];
      const trimmedQueue = mergedQueue.slice(-this.QUEUE_LIMIT);
      const removedCount = Math.max(0, mergedQueue.length - this.QUEUE_LIMIT);

      let adjustedIndex: number | null = null;

      if (queue && queue.currentIndex >= 0) {
        if (queue.currentIndex < removedCount) {
          adjustedIndex = -1;
        } else {
          adjustedIndex = queue.currentIndex - removedCount;
        }
      } else {
        adjustedIndex = adjustedIndex ?? queue?.currentIndex ?? -1;
      }

      if (queue) {
        queue.changed('queueList', true);
        await queue.update(
          { queueList: trimmedQueue, currentIndex: adjustedIndex },
          { transaction },
        );
      } else {
        queue = await this.playbackQueueModel.create(
          {
            providerUserId: options.providerUserId,
            service: options.service,
            queueList: trimmedQueue,
            currentIndex: -1,
          },
          { transaction },
        );
      }

      await transaction.commit();

      return {
        id: queue.id,
        currentIndex: adjustedIndex,
        length: trimmedQueue.length,
        removedTracks: removedCount,
      };
    } catch (error) {
      this.logger.debug(error);
      await transaction.rollback();
      throw error;
    }
  }

  async getQueue(
    options: FindPlaybackQueueOptions,
  ): Promise<GetQueueReturnType> {
    const queue = await this.playbackQueueModel.findOne({
      where: {
        providerUserId: options.providerUserId,
        service: options.service,
      },
    });

    if (!queue) {
      throw new NotFoundException(`Queue not found`);
    }

    return queue;
  }

  async skipToIndex(
    options: FindPlaybackQueueOptions,
    index: number,
  ): Promise<SkipQueueToIndexReturnType> {
    if (index <= 0) {
      throw new BadRequestException('Index must be positive');
    }

    const lastRemovedTrackIndex = index - 1;
    const transaction = await this.sequelize.transaction();

    try {
      await this.lockQueue(options, { transaction });

      const queue = await this.playbackQueueModel.findOne({
        where: options,
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });

      if (!queue || queue.queueList.length === 0) {
        await transaction.commit();
        return {
          id: queue.id || null,
          currentIndex: -1,
          track: null,
          isFinished: true,
          removedTracks: 0,
          queueLength: 0,
        };
      }

      const tracks = queue.queueList;
      const length = tracks.length;

      if (lastRemovedTrackIndex >= length) {
        queue.queueList = [];
        queue.currentIndex = -1;
        queue.updatedAt = new Date();
        queue.changed('queueList', true);
        await queue.save({ transaction });

        await transaction.commit();
        return {
          id: queue.id,
          currentIndex: -1,
          track: null,
          isFinished: true,
          removedTracks: 0,
          queueLength: queue.queueList.length,
        };
      }

      const trackToPlay = tracks[index];
      queue.queueList = tracks.slice(index);
      queue.currentIndex = -1;
      queue.updatedAt = new Date();
      queue.changed('queueList', true);
      await queue.save({ transaction });

      await transaction.commit();

      return {
        id: queue.id,
        currentIndex: -1,
        track: trackToPlay,
        isFinished: false,
        removedTracks: lastRemovedTrackIndex,
        queueLength: queue.queueList.length,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async removeByIndex(
    options: FindPlaybackQueueOptions,
    index: number,
  ): Promise<RemoveByIndexReturnType> {
    if (index < 0) {
      throw new BadRequestException('Index must be positive');
    }

    const transaction = await this.sequelize.transaction();

    try {
      await this.lockQueue(options, { transaction });

      const queue = await this.playbackQueueModel.findOne({
        where: options,
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });

      if (!queue || queue.queueList.length === 0) {
        await transaction.commit();
        return {
          id: queue.id || null,
          currentIndex: -1,
          isFinished: true,
          removedTrack: 0,
          queueLength: 0,
        };
      }

      const tracks = queue.queueList;

      if (index >= tracks.length) {
        throw new NotFoundException(`Track at index ${index} not found`);
      }

      const removedTrack = tracks[index];

      tracks.splice(index, 1);

      queue.changed('queueList', true);
      await queue.update({ queueList: tracks }, { transaction });
      await transaction.commit();

      const isFinished = tracks.length === 0;

      return {
        id: queue.id,
        isFinished,
        currentIndex: -1,
        removedTrack: index,
        queueLength: tracks.length,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async clearQueue(options: FindPlaybackQueueOptions) {
    const transaction = await this.sequelize.transaction();

    try {
      await this.lockQueue(options, { transaction });

      await this.playbackQueueModel.destroy({
        where: {
          service: options.service,
          providerUserId: options.providerUserId,
        },
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  private async lockQueue(
    options: FindPlaybackQueueOptions,
    { transaction }: Transactionable,
  ) {
    const lockKey = this.getLockKey(options);
    await this.sequelize.query(
      `SELECT pg_advisory_xact_lock(:lockKey::bigint)`,
      {
        replacements: { lockKey },
        transaction,
        type: QueryTypes.SELECT,
      },
    );
  }

  private getLockKey({ providerUserId, service }: FindPlaybackQueueOptions) {
    const stringToHash = `${INTERNAL_MUSIC_SERVICE_NAME}:plqu:${providerUserId}:${service}`;

    const hash = xxh3.xxh64(stringToHash);
    const signedHash = hash >= 2n ** 63n ? hash - 2n ** 64n : hash;

    return signedHash;
  }
}
