import { Controller, Get, Param, Render, Req, Request } from '@nestjs/common';
import { SongWhip } from 'src/schemas/song-whip.schema';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import * as spotifyUri from 'spotify-uri';
import { ConfigService } from '@nestjs/config';

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
  ) {}

  @Get(':id')
  @Render('song.hbs')
  async getHello(@Param() params, @Req() req: Request): Promise<any> {
    const data = JSON.parse(Buffer.from(params.id, 'base64').toString());
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
      message: `This action returns a #${params.id} cat`,
      song: getTemplateData(data, song),
      songString: JSON.stringify(song.toJSON()),
      url: `${this.appConfig.get<string>('FRONTEND_URL')}/songs/${data.id}`,
      // url: `${req.protocol}://${req.get('Host')}${req.originalUrl}`,
    };
  }
}
