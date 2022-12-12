import { Controller, Get, Param, Render } from '@nestjs/common';
import { SongWhip } from 'src/schemas/song-whip.schema';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import * as spotifyUri from 'spotify-uri';
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
  },
  youtubeMusic: {
    name: 'Youtube Music',
    color: '#ff0000',
  },
  youtube: {
    name: 'Youtube',
    color: '#ff0000',
  },
  tidal: {
    name: 'Youtube',
    color: '#000000',
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
    const song = await this.songWhip.getSongById(data.id);

    const getTemplateData = (data, song: SongWhip) => {
      let link;
      let appLink;
      let serviceName;
      let themeColor;
      const service = data.service;
      const serviceData = servicesData[service];

      if (data.service === 'spotify') {
        link = song.links?.spotify?.[0]?.link;

        if (!link) {
          return;
        }

        const parsedLink = spotifyUri.parse(link);
        appLink = spotifyUri.formatURI(parsedLink);
      } else if (data.service === 'itunes' || data.service === 'itunesStore') {
        link = song.links?.[data.service]?.[0]?.link;

        const country = R.pipe(R.pathOr('', ['countries', 0]), R.toLower)(link);

        link = link.replace('{country}', country);
      } else {
        link = song.links?.[data.service]?.[0]?.link;
      }

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

    return {
      song: getTemplateData(data, song),
      songString: JSON.stringify(song.toJSON()),
      url: this.songsService.createSongUrl(data.id),
    };
  }
}
