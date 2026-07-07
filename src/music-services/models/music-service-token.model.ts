import { Column, Model, Table, DataType } from 'sequelize-typescript';
import { CLIENT_UNIQUE_PROVIDES, MUSIC_SERVICE_PROVIDES } from 'src/constants';

export class MusicServiceTokenDomain {
  id: string;
  userId: string;
  provider: CLIENT_UNIQUE_PROVIDES;
  service: MUSIC_SERVICE_PROVIDES;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_date: number;
  scope: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Table({
  tableName: 'MusicServiceTokens',
})
export class MusicServiceToken extends Model<MusicServiceTokenDomain> {
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
  userId: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  provider: CLIENT_UNIQUE_PROVIDES;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  service: MUSIC_SERVICE_PROVIDES;

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
