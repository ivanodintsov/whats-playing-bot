import {
  Column,
  Model,
  Table,
  DataType,
  HasMany,
  BelongsTo,
  BelongsToMany,
  HasOne,
} from 'sequelize-typescript';
import { TrackLyric } from 'src/songs-lyrics/models/song-lyric.model';
import { ITrack } from '../types/parser';
import { Album } from './album.model';
import { Artist } from './artist.model';
import { Link } from './link.model';
import { TrackArtist } from './track-artists.model';

@Table({
  paranoid: true,
})
export class Track extends Model<ITrack> {
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
    type: DataType.STRING,
    allowNull: true,
    unique: true,
  })
  oldId: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  type: number;

  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  albumId: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  trackNumber: number;

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

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  explicit: boolean;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  duration: number;

  @HasMany(() => Link, 'trackId')
  links: Link[];

  @BelongsTo(() => Album, 'albumId')
  album: Album;

  @BelongsToMany(
    () => Artist,
    () => TrackArtist,
  )
  artists: Artist[];

  @HasOne(() => TrackLyric, 'trackId')
  lyric: TrackLyric;
}
