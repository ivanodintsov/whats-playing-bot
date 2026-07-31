import { Column, Model, Table, DataType } from 'sequelize-typescript';
import { MUSIC_SERVICE_PROVIDERS } from 'src/constants';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';
import { PlaybackQueueData, PlaybackTrack } from './types';

@Table({
  tableName: 'PlaybackQueue',
})
export class PlaybackQueue
  extends Model<PlaybackQueueData>
  implements PlaybackQueueData
{
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    unique: true,
  })
  id: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  service: MUSIC_SERVICE_PROVIDERS;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  providerUserId: TelegramUser['id'];

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: -1,
  })
  currentIndex: number;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
    defaultValue: [],
  })
  queueList: PlaybackTrack[];

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
