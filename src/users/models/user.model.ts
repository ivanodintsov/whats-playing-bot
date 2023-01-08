import { Column, Model, Table, DataType } from 'sequelize-typescript';
import { UserEntity } from '../user.dto';

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
    allowNull: false,
    unique: true,
  })
  username: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  password: string;
}
