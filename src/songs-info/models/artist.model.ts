import {
  Column,
  Model,
  Table,
  DataType,
  BelongsToMany,
  HasMany,
} from 'sequelize-typescript';
import { IArtist, IImage } from 'src/music-services/music-service-core/types';
import { AlbumArtist } from './album-artist.model';
import { Album } from './album.model';
import { ArtistGenre } from './artist-genre.model';
import { ArtistSocial } from './artist-social.model';
import { Genre } from './genre.model';
import { Link } from './link.model';
import { TrackArtist } from './track-artists.model';

@Table({
  paranoid: true,
})
export class Artist extends Model<IArtist> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    unique: true,
  })
  id: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  image: IImage;

  @HasMany(() => Link, 'artistId')
  links: Link[];

  @BelongsToMany(() => Genre, () => ArtistGenre)
  genres: Genre[];

  @BelongsToMany(() => Album, () => AlbumArtist)
  albums: Album[];

  @HasMany(() => ArtistSocial, 'artistId')
  socials: ArtistSocial[];

  TrackArtist?: TrackArtist;
}
