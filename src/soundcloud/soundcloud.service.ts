import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { MusicServiceToken } from 'src/music-service/models/music-service-token.model';

@Injectable()
export class SoundcloudService {
  private readonly logger = new Logger(SoundcloudService.name);

  constructor(
    private appConfig: ConfigService,

    @InjectModel(MusicServiceToken)
    private musicServiceTokenModel: typeof MusicServiceToken,
  ) {}
}
