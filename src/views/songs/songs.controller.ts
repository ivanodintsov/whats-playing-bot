import { Controller, Get, Param, Render } from '@nestjs/common';
import { SongWhipService } from 'src/song-whip/song-whip.service';
import * as spotifyUri from 'spotify-uri';
import * as getYouTubeID from 'get-youtube-id';
import { ConfigService } from '@nestjs/config';
import * as R from 'ramda';
import { SongsLyricsService } from 'src/songs-lyrics/songs-lyrics.service';
import { SongsInfoService } from 'src/songs-info/songs-info.service';
import { Track } from 'src/songs-info/models/track.model';
import { LinksService } from 'src/songs-info/links/links.service';

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
    private readonly appConfig: ConfigService,
    private readonly songsInfoService: SongsInfoService,
    private readonly songsLyrics: SongsLyricsService,
    private readonly songsLyricsService: SongsLyricsService,
    private readonly linksService: LinksService,
  ) {}

  @Get(':id')
  @Render('song.hbs')
  async getHello(@Param() params): Promise<any> {
    const data = this.linksService.parseTrackId(params.id);
    const songWhip = await this.songsInfoService.getTrackById(data.id);

    const getTemplateData = (data, song: Track) => {
      let serviceName;
      let themeColor;
      const service = data.service;
      const serviceData = servicesData[service];

      const linkItem = song.links.find(link => link.provider === data.service);
      const link = linkItem.url;

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
        image: song.album?.image?.url,
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
    const url = this.linksService.createTrackUrl(params.id);

    const linkItem = songWhip.links.find(
      link => link.provider === data.service,
    );

    this.songsLyricsService.getLyrics({
      id: songWhip.id,
      name: songWhip.name,
      isrc: songWhip.isrc,
      artists: song?.artists?.map?.(artist => ({
        name: artist.name,
      })),
      provider: linkItem.provider,
      providerId: linkItem.providerUrl,
    });

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
