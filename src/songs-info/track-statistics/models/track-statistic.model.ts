import {
  Column,
  Model,
  Table,
  DataType,
  BelongsTo,
} from 'sequelize-typescript';
import { Track } from 'src/songs-info/models/track.model';

export class TrackStatisticEntity {
  id?: string;
  trackId: string;
  sharedCount: number;
  likedCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

@Table({
  paranoid: true,
})
export class TrackStatistic extends Model<TrackStatisticEntity> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    unique: true,
  })
  id: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true,
  })
  trackId: Track['id'];

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  sharedCount: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  likedCount: number;

  @BelongsTo(() => Track, 'trackId')
  track: Track;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  createdAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  updatedAt: Date;
}
