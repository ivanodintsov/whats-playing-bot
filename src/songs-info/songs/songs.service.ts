import { Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { Album } from '../models/album.model';
import { Artist } from '../models/artist.model';
import { Song, SongDocument } from '../models/song.schema';
import { InjectModel as InjectMongoModel } from '@nestjs/mongoose';
import { IAlbum, IArtist, ISong } from '../types/parser';
import { Genre } from '../models/genre.model';
import { InjectModel } from '@nestjs/sequelize';
import { Link, LinkDomain, LINK_TYPE } from '../models/link.model';
import { Logger } from 'src/logger';
import { ArtistGenre } from '../models/artist-genre.model';
import { IExternalUrls, IGenre } from '../types/parser';
import { WhereOptions } from 'sequelize';
import { AlbumArtist } from '../models/album-artist.model';

type Provider = 'spotify';

@Injectable()
export class SongsService {
  private readonly logger = new Logger(SongsService.name);

  constructor(
    @InjectModel(Genre)
    private readonly genreModel: typeof Genre,

    @InjectModel(Album)
    private readonly albumModel: typeof Album,

    @InjectModel(Artist)
    private readonly artistModel: typeof Artist,

    @InjectModel(Link)
    private readonly linkModel: typeof Link,

    @InjectModel(ArtistGenre)
    private readonly artistGenreModel: typeof ArtistGenre,

    @InjectModel(AlbumArtist)
    private readonly albumArtistModel: typeof AlbumArtist,
  ) {}

  async createSong(provider: Provider, song: ISong) {
    try {
      const artists: Artist[] = [];

      for (let i = 0; i < song.artists.length; i++) {
        const artist = song.artists[i];
        const artistInstance = await this.createArtist(provider, artist);
        artists.push(artistInstance);
      }

      const album = await this.createAlbum(provider, song.album);
    } catch (error) {
      console.log(error);
    }
  }

  async createAlbum(provider: Provider, album: IAlbum) {
    const providerLink = album.links.find(link => link.provider === provider);
    const link = await this.linkModel.findOne({
      where: {
        type: LINK_TYPE.ALBUM,
        provider: providerLink.provider,
        providerId: providerLink.providerId,
      },
    });

    let albumInstance: Album;
    const AlbumDefaults: Omit<IAlbum, 'links' | 'artists'> = {
      name: album.name,
      albumType: album.albumType,
      availableMarkets: album.availableMarkets,
      totalTracks: album.totalTracks,
      image: album.image,
      releaseDate: album.releaseDate,
      isrc: album.isrc,
      upc: album.upc,
      ean: album.ean,
    };

    if (link) {
      [albumInstance] = await this.albumModel.findOrCreate({
        where: {
          id: link.albumId,
        },
        defaults: AlbumDefaults,
      });
    } else {
      albumInstance = await this.albumModel.create(AlbumDefaults);
    }

    await this.createLinks(albumInstance, LINK_TYPE.ALBUM, album.links);

    for (let i = 0; i < album?.artists?.length; i++) {
      const artist = album.artists[i];

      try {
        const artistInstance = await this.createArtist(provider, artist);
        const input = {
          albumId: albumInstance.id,
          artistId: artistInstance.id,
        };
        await this.albumArtistModel.findOrCreate({
          where: input,
          defaults: input,
        });
      } catch (error) {
        this.logger.error(error.message, error.stack);
      }
    }
  }

  async createArtist(provider: Provider, artist: IArtist) {
    const providerLink = artist.links.find(link => link.provider === provider);
    const link = await this.linkModel.findOne({
      where: {
        type: LINK_TYPE.ARTIST,
        provider: providerLink.provider,
        providerId: providerLink.providerId,
      },
    });

    let artistInstance: Artist;

    if (link) {
      [artistInstance] = await this.artistModel.findOrCreate({
        where: {
          id: link?.artistId,
        },
        defaults: {
          name: artist.name,
          image: artist.image,
        },
      });
    } else {
      artistInstance = await this.artistModel.create({
        name: artist.name,
        image: artist.image,
      });
    }

    await this.createLinks(artistInstance, LINK_TYPE.ARTIST, artist.links);
    await this.createArtistGenres(artistInstance, artist.genres);

    return artistInstance;
  }

  private async createLinks(
    instance: { id: string },
    type: LINK_TYPE,
    links: IExternalUrls,
  ) {
    for (let index = 0; index < links.length; index++) {
      const link = links[index];

      const where: WhereOptions<LinkDomain> = {
        type,
        providerUrl: link.providerUrl,
      };

      switch (type) {
        case LINK_TYPE.ALBUM:
          where.albumId = instance.id;
          break;

        case LINK_TYPE.ARTIST:
          where.artistId = instance.id;
          break;

        default:
          throw new Error('link instance id is not provided ');
      }

      try {
        await this.linkModel.findOrCreate({
          where,
          defaults: {
            type,
            provider: link.provider,
            providerUrl: link.providerUrl,
            providerId: link.providerId,
          },
        });
      } catch (error) {
        this.logger.error(error.message, error.stack);
      }
    }
  }

  private async createArtistGenres(artistInstance: Artist, genres: IGenre[]) {
    for (let i = 0; i < genres?.length; i++) {
      const genre = genres[i];

      try {
        const [genreInstance] = await this.genreModel.findOrCreate({
          where: {
            slug: genre.slug,
          },
          defaults: genre,
        });

        const [artistGenreInstance] = await this.artistGenreModel.findOrCreate({
          where: {
            genreId: genreInstance.id,
            artistId: artistInstance.id,
          },
          defaults: {
            genreId: genreInstance.id,
            artistId: artistInstance.id,
          },
        });
      } catch (error) {
        this.logger.error(error.message, error.stack);
      }
    }
  }

  async getByUrl(url: string) {
    const data = await this.artistModel.findOne({
      include: [
        {
          model: Link,
          required: true,
          where: {
            providerUrl: url,
          },
        },
      ],
    });
    console.log(data);
    return data;
  }
}
