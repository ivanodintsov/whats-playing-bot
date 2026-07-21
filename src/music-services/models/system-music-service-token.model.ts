import { Column, Model, Table, DataType } from 'sequelize-typescript';
import { MUSIC_SERVICE_PROVIDERS } from 'src/constants';
import { MusicServiceTokenShared } from './music-service-shared';

export interface SystemMusicServiceData extends MusicServiceTokenShared {}

export type SystemMusicServiceTokenModel = Model & SystemMusicServiceData;

@Table({
  tableName: 'SystemMusicServiceTokens',
})
export class SystemMusicServiceToken
  extends Model<SystemMusicServiceData>
  implements SystemMusicServiceData
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
    type: DataType.TEXT,
    allowNull: false,
  })
  access_token: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  refresh_token: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  token_type: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  expires_in: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  expires_date: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  scope: string;

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
