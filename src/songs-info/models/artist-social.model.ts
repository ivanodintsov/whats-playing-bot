import {
  Column,
  Model,
  Table,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { ArtistSocialDomain, SOCIALS, SOCIAL_STATUSES } from '../types/parser';
import { Artist } from './artist.model';

@Table({
  paranoid: true,
})
export class ArtistSocial extends Model<ArtistSocialDomain> {
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

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  social: SOCIALS;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  url: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  status: SOCIAL_STATUSES;
}
