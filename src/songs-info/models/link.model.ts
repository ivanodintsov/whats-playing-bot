import { Column, Model, Table, DataType } from 'sequelize-typescript';
import { Provider, SERVICES_PROVIDERS } from '../parser/parser.service';

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
  provider: Provider;

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
