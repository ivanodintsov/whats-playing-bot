import {
  Args,
  Query,
  Resolver,
  ResolveField,
  Parent,
  Context,
  ArgsType,
  Field,
} from '@nestjs/graphql';
import { Link, TrackEntity, TrackEntityResponse } from './models/track.model';
import { LinksService } from 'src/songs-info/links/links.service';
import { Track } from 'src/songs-info/models/track.model';
import { TrackPlaylistService } from 'src/track-playlist/track-playlist.service';
import { GetSongArgs, TrackDomainResponseDTO } from './dto/song.dto';
import { SongsInfoService } from 'src/songs-info/songs-info.service';
import { plainToClass } from 'class-transformer';
import { TrackDomainDbDTO } from 'src/songs-info/types/parser';
import { TrackStatisticsService } from 'src/songs-info/track-statistics/track-statistics.service';
import { NotFoundException } from '@nestjs/common';
import * as getYouTubeID from 'get-youtube-id';

@Resolver(() => TrackEntity)
export class TrackEntityResolver {
  constructor(
    private readonly linksService: LinksService,
    private readonly trackPlaylistService: TrackPlaylistService,
    private readonly songInfoService: SongsInfoService,
    private readonly trackStatisticsService: TrackStatisticsService,
  ) {}

  @Query(() => [TrackEntity])
  async chatPlaylists(@Args('chatId', { type: () => String }) chatId: string) {
    const response = await this.trackPlaylistService.getLastChatTracks(
      chatId,
      10,
    );

    return response;
  }

  @ResolveField('links', () => [Link])
  async links(
    @Parent() track: TrackDomainResponseDTO,
    @Context() context: any,
  ) {
    return (track.links || []).map(link => {
      let providerId;

      if (link.provider === 'youtube') {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const id = getYouTubeID(link.url, { fuzzy: false });
        providerId = id;
      }

      return {
        ...link,
        url: this.linksService.createTrackUrlFromData(track._raw, link, {
          platform: 'frontend',
        }),
        providerId,
      };
    });
  }

  @Query(() => TrackEntityResponse)
  async getSong(@Args() args: GetSongArgs) {
    const song: Track = await this.songInfoService.getTrackById(args.songId);

    if (!song) {
      throw new NotFoundException();
    }

    const songDomain = plainToClass(TrackDomainDbDTO, song.toJSON());
    const [statistics] = await this.trackStatisticsService.findOne(args.songId);

    return {
      data: plainToClass(TrackDomainResponseDTO, songDomain),
      statistics,
    };
  }
}
