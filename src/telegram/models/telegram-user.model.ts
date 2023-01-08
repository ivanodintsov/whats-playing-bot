import { Column, Model, Table, DataType } from 'sequelize-typescript';
import { Maybe } from 'src/typings';

export class TelegramUserDomain {
  id?: string;
  userId: Maybe<string>;
  tg_id: string;
  first_name: Maybe<string>;
  last_name: Maybe<string>;
  username: Maybe<string>;
  language_code: Maybe<string>;
}

@Table({
  paranoid: true,
})
export class TelegramUser extends Model<TelegramUserDomain> {
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
    allowNull: true,
  })
  userId: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  tg_id: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  first_name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  last_name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  username: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  language_code: string;
}
