import {
  Column,
  Model,
  Table,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { Artist } from './artist.model';
import { Genre } from './genre.model';

@Table({
  paranoid: true,
})
export class ArtistGenre extends Model<{
  artistId: string;
  genreId: string;
}> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    unique: true,
  })
  id: string;

  @ForeignKey(() => Artist)
  @Column({
    type: DataType.UUIDV4,
    allowNull: false,
  })
  artistId: string;

  @ForeignKey(() => Genre)
  @Column({
    type: DataType.UUIDV4,
    allowNull: false,
  })
  genreId: string;
}
