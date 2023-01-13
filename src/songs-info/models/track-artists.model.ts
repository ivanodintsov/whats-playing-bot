import {
  Column,
  Model,
  Table,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { Artist } from './artist.model';
import { Track } from './track.model';

@Table({
  paranoid: true,
})
export class TrackArtist extends Model<{
  trackId: string;
  artistId: string;
  feat: boolean;
}> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
    unique: true,
  })
  id: string;

  @ForeignKey(() => Track)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  trackId: string;

  @ForeignKey(() => Artist)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  artistId: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
  })
  feat: boolean;
}
