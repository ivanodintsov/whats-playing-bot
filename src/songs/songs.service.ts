import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TrackEntity } from 'src/domain/Track';
import { MusicServicesService } from 'src/music-services/music-services.service';
import { AlbumDocument, Album } from './schemas/album.schema';
import { ArtistDocument, Artist } from './schemas/artist.schema';
import { SongDocument, Song } from './schemas/song.schema';
import { IAlbum, IArtist, IExternalUrl, ISongSimple } from './types/types';
import { Logger } from 'src/logger';
import { SongWhipService } from 'src/song-whip/song-whip.service';

@Injectable()
export class SongsService {
  private readonly logger = new Logger(SongsService.name);

  constructor(
    @InjectModel(Song.name)
    private readonly songModel: Model<SongDocument>,

    @InjectModel(Artist.name)
    private readonly artistModel: Model<ArtistDocument>,

    @InjectModel(Album.name)
    private readonly albumModel: Model<AlbumDocument>,

    private readonly musicServices: MusicServicesService,

    protected readonly songWhip: SongWhipService,
  ) {}

  saveSong({
    data,
  }: {
    data: { song: ISongSimple; artists: IArtist[]; album: IAlbum }[];
  }) {
    console.log(data);
    // const artist = new this.artistModel(data.artists);
    // const album = new this.albumModel(data.album);
    // const song = new this.songModel(data);
  }

  async getSong({ song }: { song: TrackEntity }) {
    const services = Object.values(this.musicServices.services);
    let data: { song: ISongSimple; artists: IArtist[]; album: IAlbum };

    for (let i = 0; i < services.length; i++) {
      const service = services[i];

      try {
        const searchResponse = await service.searchTrack({
          search: {
            artist: song.artists,
            track: song.name,
            album: song.album,
            // year: song.year,
          },
          isrc: song.isrc,
          type: 'track',
        });

        if (!data) {
          data = searchResponse.data;
        }

        data.song.links = {
          ...data.song.links,
          ...searchResponse.data.song.links,
        };

        data.song.ids = {
          ...data.song.ids,
          ...searchResponse.data.song.ids,
        };

        data.album.links = {
          ...data.album.links,
          ...searchResponse.data.album.links,
        };

        data.album.ids = {
          ...data.album.ids,
          ...searchResponse.data.album.ids,
        };
      } catch (error) {
        console.log(error);
      }
    }

    try {
      const songWhip = await this.songWhip.getSong({
        url: song.url,
        country: 'us',
      });

      const links = Object.fromEntries(
        Object.entries(songWhip.links).reduce((acc, [key, value]) => {
          const url = value?.length && value.find(item => item.link);

          if (!url) {
            return acc;
          }

          const item: IExternalUrl = {
            url: url.link,
          };

          acc.push([key, item]);

          return acc;
        }, []),
      );

      data.song.links = {
        ...links,
        ...data.song.links,
      };
    } catch (error) {}

    return data;
  }
}
