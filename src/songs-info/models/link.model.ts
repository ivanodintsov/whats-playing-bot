import {
  Column,
  Model,
  Table,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { Album } from './album.model';
import { Artist } from './artist.model';
import { Track } from './track.model';

export enum LINK_TYPE {
  TRACK,
  ALBUM,
  ARTIST,
}

export type LinkDomain = {
  artistId?: string;
  albumId?: string;
  trackId?: string;
  provider: string;
  providerId: string;
  providerUrl: string;
  type: LINK_TYPE;
};

@Table({
  paranoid: true,
})
export class Link extends Model<LinkDomain> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    unique: true,
  })
  id: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  type: LINK_TYPE;

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  artistId?: string;

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  albumId?: string;

  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  trackId?: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  provider: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  providerId: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  providerUrl: string;
}
