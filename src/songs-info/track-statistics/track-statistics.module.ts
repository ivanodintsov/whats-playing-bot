import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { TrackStatistic } from './models/track-statistic.model';
import { TrackStatisticsService } from './track-statistics.service';

@Module({
  imports: [SequelizeModule.forFeature([TrackStatistic])],
  providers: [TrackStatisticsService],
  exports: [TrackStatisticsService],
})
export class TrackStatisticsModule {}
