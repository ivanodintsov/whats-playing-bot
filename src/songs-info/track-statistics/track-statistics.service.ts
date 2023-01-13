import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  TrackStatistic,
  TrackStatisticEntity,
} from './models/track-statistic.model';
import { Logger } from 'src/logger';

@Injectable()
export class TrackStatisticsService {
  private readonly logger = new Logger(TrackStatisticsService.name);

  constructor(
    @InjectModel(TrackStatistic)
    private readonly trackStatisticModel: typeof TrackStatistic,
  ) {}

  findOne(trackId: TrackStatistic['trackId']) {
    return this.trackStatisticModel.findOrCreate({
      where: {
        trackId,
      },
      defaults: {},
    });
  }

  async create(data: TrackStatisticEntity) {
    try {
      const statistics = await this.trackStatisticModel.create(data);

      return statistics;
    } catch (error) {
      this.logger.error(error.message, error.stack, 'shareInc');
    }
  }

  async shareInc(trackId: TrackStatistic['trackId']) {
    try {
      const [statistics] = await this.findOne(trackId);

      return statistics.increment({ sharedCount: 1 });
    } catch (error) {
      this.logger.error(error.message, error.stack, 'shareInc');
    }
  }

  async likeInc(trackId: TrackStatistic['trackId']) {
    try {
      const [statistics] = await this.findOne(trackId);

      return statistics.increment({ likedCount: 1 });
    } catch (error) {
      this.logger.error(error.message, error.stack, 'likeInc');
    }
  }
}
