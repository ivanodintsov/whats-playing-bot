import { Injectable } from '@nestjs/common';
import { Album } from '../models/album.model';
import { Artist } from '../models/artist.model';
import {
  ArtistSocialDomain,
  IAlbum,
  IArtist,
  ITrack,
  SOCIAL_STATUSES,
  IExternalUrls,
  IGenre,
} from 'src/music-services/music-service-core/types';
import { Genre } from '../models/genre.model';
import { InjectModel } from '@nestjs/sequelize';
import { Link } from '../models/link.model';
import {
  IExternalUrl,
  LINK_TYPE,
} from 'src/music-services/music-service-core/types';
import { Logger } from 'src/logger';
import { ArtistGenre } from '../models/artist-genre.model';
import { Op, WhereOptions } from 'sequelize';
import { AlbumArtist } from '../models/album-artist.model';
import { Track } from '../models/track.model';
import { TrackArtist } from '../models/track-artists.model';
import { ArtistSocial } from '../models/artist-social.model';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Provider } from '../parser/types';
import {
  PARSE_ALBUMS_QUEUE,
  PARSE_ARTISTS_QUEUE,
  PARSE_TRACKS_QUEUE,
} from '../constants';
import {
  ProcessAlbumTracksData,
  ProcessTrackIdData,
} from '../parse-tracks.processor';
import { ProcessAlbumIdData } from '../parse-albums.processor';
import { ProcessArtistAlbumsJobData } from '../parse-artists.processor';
import { ParserMergeUtils } from '../parser/parser-merge-utils';
// import { SongsLyricsService } from 'src/songs-lyrics/songs-lyrics.service';

@Injectable()
export class SongsService {
  private readonly logger = new Logger(SongsService.name);

  constructor(
    @InjectQueue(PARSE_TRACKS_QUEUE)
    private readonly parseTracksQueue: Queue,

    @InjectQueue(PARSE_ARTISTS_QUEUE)
    private readonly parseArtistsQueue: Queue,

    @InjectQueue(PARSE_ALBUMS_QUEUE)
    private readonly parseAlbumsQueue: Queue,

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

    @InjectModel(ArtistSocial)
    private readonly artistSocialModel: typeof ArtistSocial, // private songsLyricsService: SongsLyricsService,
  ) {}

  async createSong(provider: Provider, track: ITrack, parseNew = true) {
    try {
      const [album] = await this.createAlbum(provider, track.album, parseNew);

      const providerLink = track.links.find(
        (link) => link.provider === provider,
      );
      const link =
        !!providerLink &&
        (await this.linkModel.findOne({
          where: {
            type: LINK_TYPE.TRACK,
            provider: providerLink.provider,
            providerId: providerLink.providerId,
          },
        }));

      let trackInstance: Track;
      const TrackDefaults: Omit<ITrack, 'links' | 'artists' | 'album'> & {
        albumId: string;
      } = {
        oldId: track.oldId,
        name: track.name,
        type: track.type,
        trackNumber: track.trackNumber,
        isrc: track.isrc,
        upc: track.upc,
        ean: track.ean,
        explicit: track.explicit,
        duration: track.duration,
        albumId: album?.id,
      };

      if (link) {
        const changes: Partial<ITrack> = {};

        [trackInstance] = await this.trackModel.findOrCreate({
          where: {
            id: link.trackId,
          },
          include: [
            {
              model: Link,
            },
          ],
          defaults: TrackDefaults,
        });

        if (trackInstance.name !== track.name) {
          changes.name = track.name;
        }

        if (trackInstance.type !== track.type) {
          changes.type = track.type;
        }

        if (trackInstance.trackNumber !== track.trackNumber) {
          changes.trackNumber = track.trackNumber;
        }

        if (trackInstance.explicit !== track.explicit) {
          changes.explicit = track.explicit;
        }

        if (trackInstance.duration !== track.duration) {
          changes.duration = track.duration;
        }

        if (
          !ParserMergeUtils.isUnorderedEqual(trackInstance.isrc, track.isrc)
        ) {
          changes.isrc = ParserMergeUtils.mergeStringArraysOrNull(
            trackInstance.isrc,
            track.isrc,
          );
        }
        if (!ParserMergeUtils.isUnorderedEqual(trackInstance.upc, track.upc)) {
          changes.upc = ParserMergeUtils.mergeStringArraysOrNull(
            trackInstance.upc,
            track.upc,
          );
        }
        if (!ParserMergeUtils.isUnorderedEqual(trackInstance.ean, track.ean)) {
          changes.ean = ParserMergeUtils.mergeStringArraysOrNull(
            trackInstance.ean,
            track.ean,
          );
        }

        if (Object.keys(changes).length) {
          await trackInstance.update(changes);
        }
      } else {
        trackInstance = await this.trackModel.create(TrackDefaults);
      }

      const linksDiff =
        Array.isArray(trackInstance.links) &&
        ParserMergeUtils.diffBy(
          trackInstance.links,
          track.links,
          (link) => link.providerUrl,
          (current, incoming) => current.providerUrl === incoming.providerUrl,
        );

      await this.createLinks(
        trackInstance,
        LINK_TYPE.TRACK,
        linksDiff.created || track.links,
      );

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
        const [artistInstance, isNewArtist] = await this.createArtist(
          provider,
          artist,
          parseNew,
        );

        artists.push(artistInstance);

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

      // await this.songsLyricsService.addTrackToRemoteQueue({
      //   id: trackInstance.id,
      //   name: trackInstance.name,
      //   isrc: trackInstance.isrc,
      //   artists: artists.map(artist => ({
      //     name: artist.name,
      //   })),
      //   provider: providerLink.provider,
      //   providerId: providerLink.providerId,
      // });

      return { track: trackInstance, link: providerLink };
    } catch (error) {
      this.logger.error(error.message, error.stack);
    }
  }

  async createAlbum(
    provider: Provider,
    album: IAlbum,
    parseNew = true,
  ): Promise<[Album, boolean]> {
    const providerLink =
      album.links.find((link) => link.provider === provider) || album.links[0];

    const link =
      !!providerLink &&
      (await this.linkModel.findOne({
        where: {
          type: LINK_TYPE.ALBUM,
          provider: providerLink.provider,
          providerId: providerLink.providerId,
        },
      }));

    let albumInstance: Album;
    let isNewAlbum = false;
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
      const changes: Partial<IAlbum> = {};

      [albumInstance, isNewAlbum] = await this.albumModel.findOrCreate({
        where: {
          id: link.albumId,
        },
        include: [
          {
            model: Link,
          },
        ],
        defaults: AlbumDefaults,
      });

      if (albumInstance.name !== album.name) {
        changes.name = album.name;
      }

      if (albumInstance.albumType !== album.albumType) {
        changes.albumType = album.albumType;
      }

      if (albumInstance.totalTracks !== album.totalTracks) {
        changes.totalTracks = album.totalTracks;
      }

      if (albumInstance.releaseDate !== album.releaseDate) {
        changes.releaseDate = album.releaseDate;
      }

      if (
        ParserMergeUtils.isNeedUpdateImage(
          albumInstance.image,
          album.image,
          null,
          null,
        )
      ) {
        changes.image = ParserMergeUtils.mergeImages(
          albumInstance.image,
          album.image,
          null,
          null,
        );
      }

      if (
        !ParserMergeUtils.isUnorderedEqual(
          albumInstance.availableMarkets,
          album.availableMarkets,
        )
      ) {
        changes.availableMarkets = ParserMergeUtils.mergeStringArraysOrNull(
          albumInstance.availableMarkets,
          album.availableMarkets,
        );
      }

      if (!ParserMergeUtils.isUnorderedEqual(albumInstance.isrc, album.isrc)) {
        changes.isrc = ParserMergeUtils.mergeStringArraysOrNull(
          albumInstance.isrc,
          album.isrc,
        );
      }
      if (!ParserMergeUtils.isUnorderedEqual(albumInstance.upc, album.upc)) {
        changes.upc = ParserMergeUtils.mergeStringArraysOrNull(
          albumInstance.upc,
          album.upc,
        );
      }
      if (!ParserMergeUtils.isUnorderedEqual(albumInstance.ean, album.ean)) {
        changes.ean = ParserMergeUtils.mergeStringArraysOrNull(
          albumInstance.ean,
          album.ean,
        );
      }

      if (Object.keys(changes).length) {
        await albumInstance.update(changes);
      }
    } else {
      isNewAlbum = true;
      albumInstance = await this.albumModel.create(AlbumDefaults);
    }

    const linksDiff =
      Array.isArray(albumInstance.links) &&
      ParserMergeUtils.diffBy(
        albumInstance.links,
        album.links,
        (link) => link.providerUrl,
        (current, incoming) => current.providerUrl === incoming.providerUrl,
      );

    await this.createLinks(
      albumInstance,
      LINK_TYPE.ALBUM,
      linksDiff.created || album.links,
    );

    if (isNewAlbum && providerLink) {
      try {
        await this.processAlbumTracks(
          providerLink.provider as Provider,
          providerLink.providerId,
          null,
        );
      } catch (error) {
        this.logger.error(error.message, error.stack);
      }
    }

    for (let i = 0; i < album?.artists?.length; i++) {
      const artist = album.artists[i];

      try {
        const [artistInstance] = await this.createArtist(
          provider,
          artist,
          parseNew,
        );
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

    return [albumInstance, isNewAlbum];
  }

  async createArtist(
    provider: Provider,
    artist: IArtist,
    parseNew = true,
  ): Promise<[Artist, boolean]> {
    const providerLink =
      artist.links.find((link) => link.provider === provider) ||
      artist.links[0];

    const link =
      !!providerLink &&
      (await this.linkModel.findOne({
        where: {
          type: LINK_TYPE.ARTIST,
          provider: providerLink.provider,
          providerId: providerLink.providerId,
        },
      }));

    let artistInstance: Artist;
    let isNewArtist: boolean;

    if (link) {
      const changes: Partial<IArtist> = {};
      [artistInstance, isNewArtist] = await this.artistModel.findOrCreate({
        where: {
          id: link?.artistId,
        },
        include: [
          {
            model: Link,
          },
        ],
        defaults: {
          name: artist.name,
          image: artist.image,
        },
      });

      if (artistInstance.name !== artist.name) {
        changes.name = artist.name;
      }

      if (
        ParserMergeUtils.isNeedUpdateImage(
          artistInstance.image,
          artist.image,
          null,
          null,
        )
      ) {
        changes.image = ParserMergeUtils.mergeImages(
          artistInstance.image,
          artist.image,
          null,
          null,
        );
      }

      if (Object.keys(changes).length) {
        await artistInstance.update(changes);
      }
    } else {
      isNewArtist = true;
      artistInstance = await this.artistModel.create({
        name: artist.name,
        image: artist.image,
      });
    }

    const linksDiff =
      Array.isArray(artistInstance.links) &&
      ParserMergeUtils.diffBy(
        artistInstance.links,
        artist.links,
        (link) => link.providerUrl,
        (current, incoming) => current.providerUrl === incoming.providerUrl,
      );

    await this.createLinks(
      artistInstance,
      LINK_TYPE.ARTIST,
      linksDiff.created || artist.links,
    );

    if (isNewArtist && parseNew && providerLink) {
      try {
        await this.processArtistAlbums(
          providerLink.provider as Provider,
          providerLink.providerId,
          null,
        );
      } catch (error) {
        this.logger.error(error.message, error.stack);
      }
    }

    await this.createArtistGenres(artistInstance, artist.genres);

    return [artistInstance, isNewArtist];
  }

  async createLinks(
    instance: { id: string },
    type: LINK_TYPE,
    links: IExternalUrls,
  ) {
    for (let index = 0; index < links.length; index++) {
      const link = links[index];

      const where: WhereOptions<IExternalUrl> = {
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

  async updateAlbumImage(instance: Track, image) {
    try {
      const album = await this.albumModel.findOne({
        where: {
          id: instance.albumId,
        },
        attributes: ['id', 'image'],
      });

      if (!album) {
        return;
      }

      if (
        album.image?.url === image ||
        album.image?.alternative?.url === image
      ) {
        return;
      }

      if (album.image && !album.image.alternative) {
        await album.update({
          image: {
            ...album.image,
            alternative: {
              url: image,
            },
          },
        });
      } else if (!album.image?.url) {
        await album.update({
          image: {
            url: image,
          },
        });
      }
    } catch (error) {
      this.logger.error(error.message, error.stack);
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
            type: LINK_TYPE.ARTIST,
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
    const link = await this.linkModel.findOne({
      where: {
        providerUrl: url,
        type: LINK_TYPE.TRACK,
      },
    });

    if (!link) {
      return;
    }

    const data = await this.trackModel.findOne({
      where: {
        id: link.trackId,
      },
      include: [
        {
          model: Link,
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

  async getTrackByUrlId(id: string) {
    const link = await this.linkModel.findOne({
      where: {
        providerId: id,
        type: LINK_TYPE.TRACK,
      },
    });

    if (!link) {
      return;
    }

    const data = await this.trackModel.findOne({
      where: {
        id: link.trackId,
      },
      include: [
        {
          model: Link,
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

  async getSimpleTrackByUrl(url: string) {
    const data = await this.trackModel.findOne({
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
    return data;
  }

  async getSimpleTrackByProviderId(provider: Provider, providerId: string) {
    const data = await this.trackModel.findOne({
      include: [
        {
          model: Link,
          required: true,
          where: {
            provider,
            providerId,
          },
        },
      ],
    });
    return data;
  }

  async getTrackByProviderId(
    {
      provider,
      providerId,
    }: {
      provider: Provider;
      providerId: string;
    },
    fields?: Record<string, any>,
  ) {
    const link = await this.linkModel.findOne({
      where: {
        provider,
        providerId,
      },
    });

    if (!link) {
      return null;
    }

    return this.getTrackById(link.trackId, fields);
  }

  async getLinksByProvider(
    provider: {
      provider: Provider;
      providerId: string;
    },
    providers: Provider[],
  ) {
    const link = await Link.findOne({
      attributes: ['id'],
      where: provider,
      include: [
        {
          model: Track,
          include: [
            {
              model: Link,
              where: {
                provider: {
                  [Op.in]: providers,
                },
              },
              required: false,
            },
          ],
        },
      ],
    });

    if (!!link?.track?.links) {
      return link.track.links;
    }

    return null;
  }

  async getLinksByTrackIdAndProviderNames(
    trackId: Track['id'],
    providers: Provider[],
  ) {
    const links = await this.linkModel.findAll({
      where: {
        provider: {
          [Op.in]: providers,
        },
        trackId,
      },
    });

    return links;
  }

  protected createFindTrackIncludes(fields?: Record<string, any>) {
    return [
      {
        model: Link,
        attributes: fields?.links
          ? [
              'providerUrl',
              ...Object.entries(fields.links)
                .filter(
                  ([field, value]) => value === false && field !== '__typename',
                )
                .map(([field]) => field),
            ]
          : undefined,
      },
      {
        model: Album,
        attributes: fields?.album
          ? [
              'id',
              ...Object.entries(fields.album)
                .filter(
                  ([field, value]) =>
                    (value === false && field !== '__typename') ||
                    field === 'image',
                )
                .map(([field]) => field),
            ]
          : undefined,
        include: [
          {
            model: Link,
          },
        ],
      },
      {
        model: Artist,
        attributes: fields?.artists
          ? [
              'id',
              ...Object.entries(fields.artists)
                .filter(
                  ([field, value]) =>
                    (value === false && field !== '__typename') ||
                    field === 'image',
                )
                .map(([field]) => field),
            ]
          : undefined,
        include: [
          {
            model: Link,
          },
        ],
      },
    ];
  }

  async getTrackById(id: string, fields?: Record<string, any>) {
    const include = this.createFindTrackIncludes(fields);
    const track = await this.trackModel.findOne({
      where: {
        oldId: id,
      },
      attributes: fields
        ? [
            'id',
            'createdAt',
            ...Object.entries(fields)
              .filter(
                ([field, value]) => value === false && field !== '__typename',
              )
              .map(([field]) => field),
          ]
        : undefined,
      include,
    });

    if (track) {
      return track;
    }

    return this.trackModel.findOne({
      where: {
        id,
      },
      attributes: fields
        ? [
            'id',
            'createdAt',
            ...Object.entries(fields)
              .filter(
                ([field, value]) => value === false && field !== '__typename',
              )
              .map(([field]) => field),
          ]
        : undefined,
      include,
    });
  }

  getTrackWithAlbumAndArtists(trackId: string) {
    return this.trackModel.findOne({
      where: {
        id: trackId,
      },
      include: [
        {
          model: Album,
          include: [
            {
              model: Artist,
            },
          ],
        },
      ],
    });
  }

  async createArtistSocial(social: ArtistSocialDomain) {
    try {
      const [socialInstance, isSocialCreated] =
        await this.artistSocialModel.findOrCreate({
          where: {
            artistId: social.artistId,
            social: social.social,
            url: social.url,
          },
          defaults: social,
        });

      if (isSocialCreated && social.status === SOCIAL_STATUSES.COMPLETED) {
        await this.artistSocialModel.destroy({
          where: {
            artistId: social.artistId,
            social: social.social,
          },
        });
      } else if (
        !isSocialCreated &&
        socialInstance.status === SOCIAL_STATUSES.COMPLETED
      ) {
        return socialInstance;
      } else if (
        socialInstance.status === SOCIAL_STATUSES.WAIT_MODERATION &&
        social.status === SOCIAL_STATUSES.COMPLETED
      ) {
        await socialInstance.update({
          status: social.status,
        });
      }

      return socialInstance;
    } catch (error) {
      this.logger.error(error.message, error.stack);
    }
  }

  async addTrackIsrcs(trackId, isrcs: string[]) {
    if (!isrcs?.length) {
      return;
    }

    const track = await this.trackModel.findOne({
      where: {
        id: trackId,
      },
    });

    if (!track) {
      return;
    }

    await track.update({
      isrc: Array.from(new Set([...(track.isrc || []), ...(isrcs || [])])),
    });
  }

  async processArtistAlbums(provider, artistId, context: any) {
    const data: ProcessArtistAlbumsJobData = {
      artistId,
      provider,
      data: context,
    };
    await this.parseArtistsQueue.add('processArtistAlbums', data, {
      attempts: 1,
      removeOnComplete: true,
    });
  }

  async processAlbumTracks(provider: Provider, albumId: string, context: any) {
    const data: ProcessAlbumTracksData = {
      albumId,
      provider,
      data: context,
    };

    await this.parseTracksQueue.add('processAlbumTracks', data, {
      attempts: 1,
      removeOnComplete: true,
    });
  }

  async addIdsToQueue(provider: Provider, ids: string[]) {
    for (let index = 0; index < ids.length; index++) {
      try {
        const id = ids[index];

        const data: ProcessAlbumIdData = {
          albumId: id,
          provider,
        };

        await this.parseAlbumsQueue.add('processAlbumId', data, {
          attempts: 1,
          removeOnComplete: true,
        });
      } catch (error) {
        this.logger.error(error.message, error.stack);
      }
    }
  }

  async addTrackIdsToQueue(provider: Provider, ids: string[]) {
    for (let index = 0; index < ids.length; index++) {
      try {
        const id = ids[index];

        const data: ProcessTrackIdData = {
          trackId: id,
          provider,
        };

        await this.parseTracksQueue.add('processTrackId', data, {
          attempts: 1,
          removeOnComplete: true,
        });
      } catch (error) {
        this.logger.error(error.message, error.stack);
      }
    }
  }
}
