import {
  Column,
  Model,
  Table,
  DataType,
  BelongsTo,
} from 'sequelize-typescript';
import { CLIENT_PROVIDES } from 'src/constants';
import { Track } from 'src/songs-info/models/track.model';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';
import { Maybe } from 'src/typings';

export class SharedTrackDomain {
  id?: string;
  trackId: Track['id'];
  providerUserId: TelegramUser['id'];
  provider: CLIENT_PROVIDES;
  chat_id: Maybe<string>;
  createdAt?: Date;
  updatedAt?: Date;
}

@Table({
  paranoid: true,
})
export class SharedTrack extends Model<SharedTrackDomain> {
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
  trackId: Track['id'];

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  providerUserId: TelegramUser['id'];

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  provider: CLIENT_PROVIDES;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  chat_id: Maybe<string>;

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

  @BelongsTo(() => Track, 'trackId')
  track: Track;
}
