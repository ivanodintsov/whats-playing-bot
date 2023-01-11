import { Controller, Get } from '@nestjs/common';
import { ImportDbService } from './import-db.service';

@Controller('import-db')
export class ImportDbController {
  constructor(private readonly importDbService: ImportDbService) {}

  @Get('tracks')
  async importTracks() {
    this.importDbService.importTracks();

    return {
      result: 'done',
    };
  }

  @Get('playlist')
  async importPlaylist() {
    this.importDbService.importPlaylist();

    return {
      result: 'done',
    };
  }

  @Get('telegramUsers')
  async importTelegramUsers() {
    this.importDbService.importTelegramUsers();

    return {
      result: 'done',
    };
  }

  @Get('importSpotifyTokens')
  async importSpotifyTokens() {
    this.importDbService.importSpotifyTokens();

    return {
      result: 'done',
    };
  }

  @Get('importStatistics')
  async importStatistics() {
    this.importDbService.importStatistics();

    return {
      result: 'done',
    };
  }
}
