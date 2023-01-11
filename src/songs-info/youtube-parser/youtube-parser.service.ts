import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import * as getYouTubeID from 'get-youtube-id';
import { CLIENT_UNIQUE_PROVIDES } from 'src/constants';
import { SpotifyService } from 'src/spotify/spotify.service';
import { ParserService } from '../parser/parser.service';
import { SpotifyParserService } from '../spotify-parser/spotify-parser.service';
import {
  ALBUM_TYPE,
  IAlbum,
  IArtist,
  ITrack,
  RELEASE_DATE_PRECISION,
  SONG_TYPE,
  SpotifyURL,
  YouTubeURL,
} from '../types/parser';

const API_KEY = '';
const API_URL = 'https://www.googleapis.com/youtube/v3';

const spotifyTgUser = {
  userId: '7ea04c38-128f-48da-a066-ee6b5488f9c3',
  provider: CLIENT_UNIQUE_PROVIDES.TELEGRAM,
};

type VideoDetails = {
  id: string;
  snippet: {
    title: string;
    channelId: string;
  };
};

@Injectable()
export class YoutubeParserService extends ParserService {
  protected readonly _type = 'youtube';

  constructor(
    private readonly httpService: HttpService,
    private readonly spotifyService: SpotifyService,
    private readonly spotifyParser: SpotifyParserService,
  ) {
    super();
  }

  public parseUrl(url: string): YouTubeURL {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const parsedUrl = getYouTubeID(url, { fuzzy: false });

    if (!parsedUrl) {
      return;
    }

    return {
      type: 'youtube',
      url: {
        id: parsedUrl,
      },
    };
  }

  public async parseSong(url: YouTubeURL): Promise<ITrack> {
    const videoDetails = await this.getVideoDetails(url);

    if (!videoDetails) {
      return;
    }

    const spotifyResponse = await this.spotifyService.searchTracks({
      user: spotifyTgUser,
      search: videoDetails.snippet.title,
      options: {
        pagination: {
          limit: 1,
        },
      },
    });

    const track = spotifyResponse.response.body.tracks?.items?.[0];

    if (!track) {
      return;
    }

    const song = await this.spotifyParser.parseSong({
      type: 'spotify',
      url: {
        id: track.id,
        type: 'track',
      },
    });

    this._updateSong(videoDetails, song);

    return song as ITrack;
  }

  public async updateSong(song: ITrack) {
    const videoDetails = await this.searchVideo(song);

    return this._updateSong(videoDetails, song);
  }

  private _updateSong(videoDetails: VideoDetails, song: ITrack) {
    if (!videoDetails) {
      return song;
    }

    song.artists[0].links = [
      ...song.artists[0].links,
      {
        providerUrl: `https://music.youtube.com/channel/${videoDetails.snippet.channelId}`,
        providerId: videoDetails.snippet.channelId,
        provider: 'youtubeMusic',
      },
      {
        providerUrl: `https://www.youtube.com/channel/${videoDetails.snippet.channelId}`,
        providerId: videoDetails.snippet.channelId,
        provider: 'youtube',
      },
    ];

    song.links = [
      ...song.links,
      {
        providerUrl: `https://music.youtube.com/watch?v=${videoDetails.id}`,
        providerId: videoDetails.id,
        provider: 'youtubeMusic',
      },
      {
        providerUrl: `https://www.youtube.com/watch?v=${videoDetails.id}`,
        providerId: videoDetails.id,
        provider: 'youtube',
      },
    ];

    return song;
  }

  private async getVideoDetails(url: YouTubeURL): Promise<VideoDetails> {
    const response = await this.httpService
      .request({
        method: 'get',
        baseURL: API_URL,
        url: '/videos',
        params: {
          key: API_KEY,
          part:
            'id,snippet,contentDetails,topicDetails,status,player,recordingDetails',
          videoCategoryId: 10,
          id: url.url.id,
        },
      })
      .toPromise();

    const item = response.data?.items?.[0];

    if (!item) {
      return;
    }

    return {
      id: item.id,
      snippet: {
        title: item.snippet.title,
        channelId: item.snippet.channelId,
      },
    };
  }

  private async searchVideo(song: ITrack): Promise<VideoDetails> {
    const search = `${song.name} ${song?.artists
      ?.map(artist => artist.name)
      .join(' ')}`;

    const response = await this.httpService
      .request({
        method: 'get',
        baseURL: API_URL,
        url: '/search',
        params: {
          key: API_KEY,
          q: search,
          type: 'video',
          part: 'snippet',
          videoCategoryId: 10,
          order: 'relevance',
        },
      })
      .toPromise();

    const item = response.data?.items?.[0];

    if (!item) {
      return;
    }

    return {
      id: item.id?.videoId,
      snippet: {
        title: item.snippet.title,
        channelId: item.snippet.channelId,
      },
    };
  }
}
