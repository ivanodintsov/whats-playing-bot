import { Column, Model, Table, DataType, HasOne } from 'sequelize-typescript';
import { UserEntity } from '../user.dto';
import { TelegramUser } from 'src/telegram/models/telegram-user.model';

@Table({
  paranoid: true,
})
export class User extends Model<UserEntity> {
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
  username: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  password: string;

  @HasOne(() => TelegramUser, 'userId')
  tgUser: TelegramUser;
}
