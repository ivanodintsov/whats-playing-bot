import { Column, Model, Table, DataType } from 'sequelize-typescript';
import { CLIENT_UNIQUE_PROVIDES } from 'src/constants';

export class SpotifyTokenDomain {
  id: string;
  userId: string;
  provider: CLIENT_UNIQUE_PROVIDES;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_date: number;
  scope: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Table({})
export class SpotifyToken extends Model<SpotifyTokenDomain> {
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
