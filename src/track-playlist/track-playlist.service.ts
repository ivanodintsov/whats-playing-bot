import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { plainToClass } from 'class-transformer';
import { Sequelize } from 'sequelize';
import { Op } from 'sequelize';
import { WhereOptions } from 'sequelize';
import { Album } from 'src/songs-info/models/album.model';
import { Artist } from 'src/songs-info/models/artist.model';
import { Link } from 'src/songs-info/models/link.model';
import { Track } from 'src/songs-info/models/track.model';
import { TrackDomainDbDTO } from 'src/music-services/music-service-core/dto';
import { SharedTrack, SharedTrackDomain } from './models/shared-track.model';

@Injectable()
export class TrackPlaylistService {
  constructor(
    @InjectModel(SharedTrack)
    private readonly sharedTrackModel: typeof SharedTrack,
  ) {}

  addSong(data: Omit<SharedTrackDomain, 'id'>) {
    return this.sharedTrackModel.create(data);
  }

  async getLastChatTracks(chatId: string, limit: number) {
    const where: WhereOptions<SharedTrack> = {
      chat_id: chatId,
    };
    const bind: { cursorCreatedAt?: Date; cursorId?: string } = {};

    const data = await this.sharedTrackModel.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: limit,
      include: [
        {
          model: Track,
          required: true,
          include: [
            {
              model: Artist,
            },
            {
              model: Link,
            },
            {
              model: Album,
            },
          ],
        },
      ],
      bind,
    });

    return (data || []).map((shared) => shared.track);
  }

  async getPaginatedTracks(limit: number, cursor?: string, fields?: any) {
    let where: WhereOptions<SharedTrack> = {};
    const bind: { cursorCreatedAt?: Date; cursorId?: string } = {};
    const parsedCursor = cursor && this.parseCursor(cursor);

    if (parsedCursor) {
      where = {
        [Op.and]: [
          Sequelize.literal(
            `("SharedTrack"."createdAt", "SharedTrack"."id") < (:cursorCreatedAt, :cursorId)`,
          ),
        ],
      };

      bind.cursorCreatedAt = parsedCursor?.createdAt;
      bind.cursorId = parsedCursor?.id;
    }

    const data = await this.sharedTrackModel.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: limit + 1,
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
      include: [
        {
          model: Track,
          required: true,
          attributes: fields?.track
            ? [
                'id',
                'albumId',
                ...Object.entries(fields.track)
                  .filter(
                    ([field, value]) =>
                      value === false && field !== '__typename',
                  )
                  .map(([field]) => field),
              ]
            : undefined,
          include: [
            {
              model: Artist,
              attributes: fields?.track?.artists
                ? [
                    'id',
                    ...Object.entries(fields.track.artists)
                      .filter(
                        ([field, value]) =>
                          (value === false && field !== '__typename') ||
                          field === 'image',
                      )
                      .map(([field]) => field),
                  ]
                : undefined,
            },
            {
              model: Link,
              separate: true,
              attributes: fields?.track?.links
                ? [
                    'providerUrl',
                    ...Object.entries(fields.track.links)
                      .filter(
                        ([field, value]) =>
                          value === false && field !== '__typename',
                      )
                      .map(([field]) => field),
                  ]
                : undefined,
            },
            {
              model: Album,
              attributes: fields?.track?.album
                ? [
                    'id',
                    ...Object.entries(fields.track.album)
                      .filter(
                        ([field, value]) =>
                          (value === false && field !== '__typename') ||
                          field === 'image',
                      )
                      .map(([field]) => field),
                  ]
                : undefined,
            },
          ],
        },
      ],
      bind,
    });

    return this.createListWithNextItem(data, limit);
  }

  async getPaginatedTracksByPage(perPage: number, page = 1, fields?: any) {
    const where: WhereOptions<SharedTrack> = {};
    const bind: { cursorCreatedAt?: Date; cursorId?: string } = {};
    const skipMultiplier = page - 1;

    const data = await this.sharedTrackModel.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: perPage + 1,
      offset: skipMultiplier * perPage,
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
      include: [
        {
          model: Track,
          required: true,
          attributes: fields?.track
            ? [
                'id',
                'albumId',
                ...Object.entries(fields.track)
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
              model: Artist,
              attributes: fields?.track?.artists
                ? [
                    'id',
                    ...Object.entries(fields.track.artists)
                      .filter(
                        ([field, value]) =>
                          value === false && field !== '__typename',
                      )
                      .map(([field]) => field),
                  ]
                : undefined,
            },
            {
              model: Link,
              separate: true,
              attributes: fields?.track?.links
                ? [
                    'providerUrl',
                    ...Object.entries(fields.track.links)
                      .filter(
                        ([field, value]) =>
                          value === false && field !== '__typename',
                      )
                      .map(([field]) => field),
                  ]
                : undefined,
            },
            {
              model: Album,
              attributes: fields?.track?.album
                ? [
                    'id',
                    ...Object.entries(fields.track.album)
                      .filter(
                        ([field, value]) =>
                          (value === false && field !== '__typename') ||
                          field === 'image',
                      )
                      .map(([field]) => field),
                  ]
                : undefined,
            },
          ],
        },
      ],
      bind,
    });

    return this.createListWithNextItem(data, perPage);
  }

  private createListWithNextItem(list: SharedTrack[], limit: number) {
    let data = list || [];
    let nextItem: SharedTrack | undefined;

    if (list?.length > limit - 1) {
      data = data.slice(0, -1);
      nextItem = data[data.length - 1];
    }

    return {
      data: data.map((shared) => {
        const data = shared.toJSON ? shared.toJSON() : shared;
        const entityTrack = plainToClass(
          TrackDomainDbDTO,
          shared.track.toJSON ? shared.track.toJSON() : shared.track,
        );

        return {
          ...data,
          track: entityTrack,
        };
      }),
      nextItemCursor: nextItem && this.createCursor(nextItem),
    };
  }

  private createCursor({
    id,
    createdAt,
  }: Pick<SharedTrackDomain, 'id' | 'createdAt'>) {
    return Buffer.from(
      JSON.stringify({
        id,
        createdAt,
      }),
    ).toString('base64');
  }

  private parseCursor(
    cursor: string,
  ): Pick<SharedTrackDomain, 'id' | 'createdAt'> {
    return JSON.parse(Buffer.from(cursor, 'base64').toString());
  }
}
