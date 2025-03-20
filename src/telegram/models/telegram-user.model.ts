import {
  Column,
  Model,
  Table,
  DataType,
  BelongsTo,
} from 'sequelize-typescript';
import { Maybe } from 'src/typings';
import { User } from 'src/users/models/user.model';

export class TelegramUserDomain {
  id?: string;
  userId: string;
  tg_id: string;
  first_name: Maybe<string>;
  last_name: Maybe<string>;
  username: Maybe<string>;
  language_code: Maybe<string>;
  createdAt?: Date;
  updatedAt?: Date;
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
    allowNull: false,
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

  @BelongsTo(() => User, 'userId')
  user: User;
}
