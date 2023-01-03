import { Column, Model, Table, DataType } from 'sequelize-typescript';
import { IGenre } from '../types/parser';

@Table({
  paranoid: true,
})
export class Genre extends Model<IGenre> {
  constructor(...args) {
    super(...args);
  }

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
  })
  slug: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  name: string;
}
