import {
  Column,
  Model,
  Table,
  DataType,
  HasMany,
  BelongsToMany,
} from 'sequelize-typescript';
import { ALBUM_TYPE, IAlbum, IImage } from '../types/parser';
import { AlbumArtist } from './album-artist.model';
import { Artist } from './artist.model';
import { Link } from './link.model';

@Table({
  paranoid: true,
})
export class Album extends Model<IAlbum> {
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
  name: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  albumType: ALBUM_TYPE;

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: true,
  })
  availableMarkets: string[];

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  totalTracks: number;

  @HasMany(() => Link, 'albumId')
  links: Link[];

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  image: IImage;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  releaseDate: Date;

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: true,
  })
  isrc: string[];

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: true,
  })
  upc: string[];

  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: true,
  })
  ean: string[];

  @BelongsToMany(
    () => Artist,
    () => AlbumArtist,
  )
  artists: Artist[];
}
