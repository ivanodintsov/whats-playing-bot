import {
  Args,
  Query,
  Resolver,
  ResolveField,
  Parent,
  Context,
} from '@nestjs/graphql';
import { Link, TrackEntity } from './models/track.model';
import { LinksService } from 'src/songs-info/links/links.service';
import { Track } from 'src/songs-info/models/track.model';
import { TrackPlaylistService } from 'src/track-playlist/track-playlist.service';

@Resolver(() => TrackEntity)
export class TrackEntityResolver {
  constructor(
    private readonly linksService: LinksService,
    private readonly trackPlaylistService: TrackPlaylistService,
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
  async links(@Parent() track: Track, @Context() context: any) {
    return (track.links || []).map(link => {
      return {
        ...link,
        url: this.linksService.createTrackUrlFromData(track, link, {
          platform: 'frontend',
        }),
      };
    });
  }
}
