import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SongsService } from './songs.service';
import { Album } from '../models/album.model';
import { Artist } from '../models/artist.model';
import { Genre } from '../models/genre.model';
import { ArtistGenre } from '../models/artist-genre.model';
import { Link } from '../models/link.model';
import { AlbumArtist } from '../models/album-artist.model';
import { Track } from '../models/track.model';
import { TrackArtist } from '../models/track-artists.model';
import { ArtistSocial } from '../models/artist-social.model';
import { BullModule } from '@nestjs/bull';
import {
  PARSE_ALBUMS_QUEUE,
  PARSE_ARTISTS_QUEUE,
  PARSE_TRACKS_QUEUE,
} from '../constants';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Genre,
      Album,
      Artist,
      ArtistGenre,
      Link,
      AlbumArtist,
      Track,
      TrackArtist,
      ArtistSocial,
    ]),
    BullModule.registerQueueAsync(
      {
        name: PARSE_TRACKS_QUEUE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          limiter: {
            max: 1,
            duration: parseInt(
              configService.get<string>('PARSE_TRACKS_DURATION'),
              10,
            ),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: PARSE_ARTISTS_QUEUE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          limiter: {
            max: 1,
            duration: parseInt(
              configService.get<string>('PARSE_ARTISTS_DURATION'),
              10,
            ),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: PARSE_ALBUMS_QUEUE,
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          limiter: {
            max: 1,
            duration: parseInt(
              configService.get<string>('PARSE_ALBUMS_DURATION'),
              10,
            ),
          },
        }),
        inject: [ConfigService],
      },
    ),
  ],
  providers: [SongsService],
  exports: [SongsService],
})
export class SongsModule {}
