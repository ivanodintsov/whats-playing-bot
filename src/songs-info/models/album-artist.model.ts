import {
  Column,
  Model,
  Table,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { Album } from './album.model';
import { Artist } from './artist.model';

@Table({
  paranoid: true,
})
export class AlbumArtist extends Model<{
  artistId: string;
  albumId: string;
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

  @ForeignKey(() => Album)
  @Column({
    type: DataType.UUIDV4,
    allowNull: false,
  })
  albumId: string;
}
