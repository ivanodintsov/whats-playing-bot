import { Controller, Get, Param, Render } from '@nestjs/common';
import { SongWhip } from 'src/schemas/song-whip.schema';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import * as spotifyUri from 'spotify-uri';
import * as getYouTubeID from 'get-youtube-id';
import { ConfigService } from '@nestjs/config';
import { SongsService } from './songs.service';
import * as R from 'ramda';

const servicesData = {
  spotify: {
    color: '#1feb6a',
  },
  itunes: {
    name: 'Apple Music',
    color: '#fa57c1',
    deepLink: 'music://',
  },
  youtubeMusic: {
    name: 'Youtube Music',
    color: '#ff0000',
    deepLink: 'youtubemusic://',
  },
  youtube: {
    name: 'Youtube',
    color: '#ff0000',
    deepLink: 'vnd.youtube://',
  },
  tidal: {
    name: 'Tidal',
    color: '#000000',
    deepLink: 'tidal://',
  },
};

@Controller('songs')
export class SongsController {
  constructor(
    private readonly songWhip: SongWhipService,
    private appConfig: ConfigService,
    private songsService: SongsService,
  ) {}

  @Get(':id')
  @Render('song.hbs')
  async getHello(@Param() params): Promise<any> {
    const data = this.songsService.parseSongId(params.id);
    const songWhip = await this.songWhip.getSongById(data.id);

    const getTemplateData = (data, song: SongWhip) => {
      let link;
      let serviceName;
      let themeColor;
      const service = data.service;
      const serviceData = servicesData[service];

      if (data.service === 'spotify') {
        link = song.links?.spotify?.[0]?.link;
      } else if (data.service === 'itunes' || data.service === 'itunesStore') {
        link = song.links?.[data.service]?.[0]?.link;

        const country = R.pipe(R.pathOr('', ['countries', 0]), R.toLower)(link);

        link = link.replace('{country}', country);
      } else {
        link = song.links?.[data.service]?.[0]?.link;
      }

      const appLink = this.createDeepLink(
        data.service,
        link,
        serviceData?.deepLink,
      );

      if (serviceData) {
        serviceName = serviceData.name || service;
        themeColor = serviceData.color || '#1feb6a';
      }

      if (!serviceName) {
        serviceName = service;
      }

      return {
        name: song.name,
        artists: song.artists,
        image: song.image,
        link,
        appLink,
        service,
        serviceName,
        themeColor,
      };
    };

    const song = getTemplateData(data, songWhip);
    const title = `${song.name} - ${song.artists
      ?.map?.(artist => artist.name)
      ?.join?.(', ')}`;
    const url = this.songsService.createSongUrl(params.id);

    return {
      song,
      url,
      meta: {
        title,
        url,
        image: song?.image,
        themeColor: song?.themeColor,
      },
      layout: 'main',
    };
  }

  private createDeepLink(service: string, link: string, prefix: string) {
    if (service === 'spotify') {
      const parsedLink = spotifyUri.parse(link);
      return spotifyUri.formatURI(parsedLink);
    }

    if (service === 'youtube') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const id = getYouTubeID(link, { fuzzy: false });

      if (id) {
        return `vnd.youtube://${id}`;
      }
    }

    return link.replace(/https?:\/\//, prefix);
  }
}
