import { Injectable } from '@nestjs/common';

import { ParserService } from './parser/parser.service';

import { SpotifyParserService } from './spotify-parser/spotify-parser.service';
import { ParsedURL } from './types/parser';
import { YoutubeParserService } from './youtube-parser/youtube-parser.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { SongsService } from './songs/songs.service';

// import { TidalParserService } from './tidal-parser/tidal-parser.service';

@Injectable()
export class SongsInfoService {
  private readonly parsers: Record<string, ParserService>;

  constructor(
    private songsService: SongsService,
    private readonly spotifyParser: SpotifyParserService,
    private readonly youtubeParser: YoutubeParserService, // private readonly tidalParser: TidalParserService,
  ) {
    this.parsers = {
      [spotifyParser.type]: spotifyParser,
      // [youtubeParser.type]: youtubeParser,
      // [tidalParser.type]: tidalParser,
    };
  }

  private getParser = (
    url: string,
  ): {
    parser: ParserService;
    url: ParsedURL;
  } => {
    const parsersList = Object.values(this.parsers);

    for (let index = 0; index < parsersList.length; index++) {
      const parser = parsersList[index];
      try {
        const parsedUrl = parser.parseUrl(url);

        if (parsedUrl) {
          return {
            parser,
            url: parsedUrl,
          };
        }
      } catch (error) {}
    }
  };

  public async parseSong(url: string) {
    const parserData = this.getParser(url);

    if (!parserData) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    }

    const { parser } = parserData;

    let song = await parser.parseSong(parserData.url);

    const parsersList = Object.values(this.parsers);

    for (let index = 0; index < parsersList.length; index++) {
      const parser = parsersList[index];
      try {
        if (parser.type === parserData.parser.type) {
          continue;
        }

        song = await parser.updateSong(song);
      } catch (error) {
        console.log(error);
      }
    }

    await this.songsService.createSong('spotify', song);

    return song;
  }
}
