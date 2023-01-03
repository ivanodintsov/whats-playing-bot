import { Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { Album } from '../models/album.model';
import { Artist } from '../models/artist.model';
import { IAlbum, IArtist, ITrack } from '../types/parser';
import { Genre } from '../models/genre.model';
import { InjectModel } from '@nestjs/sequelize';
import { Link, LinkDomain, LINK_TYPE } from '../models/link.model';
import { Logger } from 'src/logger';
import { ArtistGenre } from '../models/artist-genre.model';
import { IExternalUrls, IGenre } from '../types/parser';
import { WhereOptions } from 'sequelize';
import { AlbumArtist } from '../models/album-artist.model';
import { Track } from '../models/track.model';
import { TrackArtist } from '../models/track-artists.model';

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

    @InjectModel(Track)
    private readonly trackModel: typeof Track,

    @InjectModel(TrackArtist)
    private readonly trackArtistModel: typeof TrackArtist,
  ) {}

  async createSong(provider: Provider, track: ITrack) {
    try {
      const album = await this.createAlbum(provider, track.album);

      const providerLink = track.links.find(link => link.provider === provider);
      const link = await this.linkModel.findOne({
        where: {
          type: LINK_TYPE.TRACK,
          provider: providerLink.provider,
          providerId: providerLink.providerId,
        },
      });

      let trackInstance: Track;
      const TrackDefaults: Omit<ITrack, 'links' | 'artists' | 'album'> & {
        albumId: string;
      } = {
        name: track.name,
        type: track.type,
        trackNumber: track.trackNumber,
        isrc: track.isrc,
        upc: track.upc,
        ean: track.ean,
        explicit: track.explicit,
        duration: track.duration,
        albumId: album.id,
      };

      if (link) {
        [trackInstance] = await this.trackModel.findOrCreate({
          where: {
            id: link.trackId,
          },
          defaults: TrackDefaults,
        });

        const isrc = Array.from(
          new Set([...(track.isrc || []), ...(trackInstance.isrc || [])]),
        );
        const upc = Array.from(
          new Set([...(track.upc || []), ...(trackInstance.upc || [])]),
        );
        const ean = Array.from(
          new Set([...(track.ean || []), ...(trackInstance.ean || [])]),
        );
        await trackInstance.update({
          isrc: isrc.length ? isrc : null,
          upc: upc.length ? upc : null,
          ean: ean.length ? ean : null,
        });
      } else {
        trackInstance = await this.trackModel.create(TrackDefaults);
      }

      await this.createLinks(trackInstance, LINK_TYPE.TRACK, track.links);

      const albumWithArtists = await this.albumModel.findOne({
        where: {
          id: album.id,
        },
        attributes: ['id'],
        include: [
          {
            model: Artist,
            attributes: ['id'],
          },
        ],
      });
      const albumArtistsHash = albumWithArtists.artists.reduce(
        (acc, artist) => {
          acc[artist.id] = artist.id;

          return acc;
        },
        {},
      );

      const artists: Artist[] = [];

      for (let i = 0; i < track.artists.length; i++) {
        const artist = track.artists[i];
        const artistInstance = await this.createArtist(provider, artist);

        await this.trackArtistModel.findOrCreate({
          where: {
            trackId: trackInstance.id,
            artistId: artistInstance.id,
          },
          defaults: {
            trackId: trackInstance.id,
            artistId: artistInstance.id,
            feat: !!albumArtistsHash[artistInstance.id],
          },
        });
      }
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

      const isrc = Array.from(
        new Set([...(album.isrc || []), ...(albumInstance.isrc || [])]),
      );
      const upc = Array.from(
        new Set([...(album.upc || []), ...(albumInstance.upc || [])]),
      );
      const ean = Array.from(
        new Set([...(album.ean || []), ...(albumInstance.ean || [])]),
      );
      await albumInstance.update({
        isrc: isrc.length ? isrc : null,
        upc: upc.length ? upc : null,
        ean: ean.length ? ean : null,
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

    return albumInstance;
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

        case LINK_TYPE.TRACK:
          where.trackId = instance.id;
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

  async getAlbumByUrl(url: string) {
    const data = await this.albumModel.findOne({
      include: [
        {
          model: Link,
          required: true,
          where: {
            providerUrl: url,
          },
        },
        {
          model: Artist,
        },
        {
          model: Track,
        },
      ],
    });
    return data;
  }

  async getArtistByUrl(url: string) {
    const data = await this.artistModel.findOne({
      include: [
        {
          model: Link,
          required: true,
          where: {
            providerUrl: url,
          },
        },
        {
          model: Album,
        },
        {
          model: Genre,
        },
      ],
    });
    return data;
  }

  async getTrackByUrl(url: string) {
    const data = await this.trackModel.findOne({
      include: [
        {
          model: Link,
          required: true,
          where: {
            providerUrl: url,
          },
        },
        {
          model: Album,
        },
        {
          model: Artist,
        },
      ],
    });
    return data;
  }
}
