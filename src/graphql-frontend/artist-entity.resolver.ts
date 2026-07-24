import { Resolver, ResolveField, Parent, Context } from '@nestjs/graphql';
import { Link, SongArtist } from './models/track.model';
import { LinksService } from 'src/songs-info/links/links.service';
import * as spotifyUri from 'spotify-uri';
import { MUSIC_SERVICE_PROVIDER_NAMES } from 'src/constants';
import { ArtistResponseDTO } from './dto/artist.dto';

@Resolver(() => SongArtist)
export class ArtistResolver {
  constructor(private readonly linksService: LinksService) {}

  @ResolveField('links', () => [Link])
  async links(@Parent() artist: ArtistResponseDTO, @Context() context: any) {
    return (artist.links || []).map((link) => {
      let providerId: string, url: string;

      if (link.provider === MUSIC_SERVICE_PROVIDER_NAMES.SPOTIFY) {
        if (link.providerId) {
          providerId = link.providerId;
        } else {
          const parsedLink = spotifyUri.parse(link.providerUrl);

          if (parsedLink.type === 'artist') {
            const parsed = parsedLink as spotifyUri.Artist;
            providerId = parsed.id;
          }
        }
      }

      if (link.provider === MUSIC_SERVICE_PROVIDER_NAMES.SOUNDCLOUD) {
        providerId = link.providerId;
        url = link.providerUrl;
      }

      if (!url) {
        url = this.linksService.createArtistUrlFromData(artist._raw);
      }

      return {
        ...link,
        url,
        providerId,
      };
    });
  }
}
