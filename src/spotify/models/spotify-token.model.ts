import { Column, Model, Table, DataType } from 'sequelize-typescript';
import { Maybe } from 'src/typings';

export class SpotifyTokenDomain {
  id: string;
  oldId: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_date: number;
  scope: string;
  tg_id: Maybe<string>;
}

@Table({
  paranoid: true,
})
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
    type: DataType.STRING,
    allowNull: true,
    unique: true,
  })
  oldId: string;

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
    type: DataType.STRING,
    allowNull: true,
  })
  tg_id: string;
}
