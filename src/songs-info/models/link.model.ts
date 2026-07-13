import {
  Column,
  Model,
  Table,
  DataType,
  BelongsTo,
} from 'sequelize-typescript';
import { SERVICES_PROVIDERS } from '../parser/constants';
import { IExternalUrl } from 'src/music-services/music-service-core/types';
import { Track } from './track.model';

@Table({
  paranoid: true,
})
export class Link extends Model<IExternalUrl> {
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
  type: IExternalUrl['type'];

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
  provider: IExternalUrl['provider'];

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  providerId: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  providerUrl: string;

  @BelongsTo(() => Track, 'trackId')
  track: Track;

  @Column(DataType.VIRTUAL)
  get url() {
    let link = this.providerUrl;

    if (
      this.provider === SERVICES_PROVIDERS.itunes ||
      this.provider === SERVICES_PROVIDERS.itunesStore
    ) {
      link = link.replace('/{country}/', '/');
    }

    return link;
  }
}
