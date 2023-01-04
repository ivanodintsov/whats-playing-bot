import {
  Column,
  Model,
  Table,
  DataType,
  HasMany,
  BelongsTo,
  BelongsToMany,
  HasOne,
} from 'sequelize-typescript';
import { Track } from 'src/songs-info/models/track.model';

export enum STATUSES {
  WAIT_MODERATION,
  NEED_MANUAL_CREATION,
  COMPLETED,
}

export enum PROVIDERS {
  MANUAL,
  MUSIXMATCH,
}

export class TrackLyricDomain {
  id?: string;
  trackId: string;
  text: string;
  status: STATUSES;
  provider: PROVIDERS;
}

@Table({
  paranoid: true,
})
export class TrackLyric extends Model<TrackLyricDomain> {
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
  })
  trackId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  text: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  status: STATUSES;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  provider: PROVIDERS;

  @BelongsTo(() => Track, 'trackId')
  track: Track;
}
