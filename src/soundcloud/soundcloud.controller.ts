import { Controller } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SoundcloudService } from './soundcloud.service';

@Controller('soundcloud')
export class SoundcloudController {
  constructor(
    private readonly soundcloudService: SoundcloudService,
    private readonly appConfig: ConfigService,
  ) {}
}
