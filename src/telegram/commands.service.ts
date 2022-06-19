import { Injectable } from '@nestjs/common';
import { Message } from 'typegram';
import { SpotifyPlaylistService } from 'src/spotify/playlist.service';
import { Logger } from 'src/logger';
import { TrackEntity } from 'src/domain/Track';
import { SongWhip } from 'src/schemas/song-whip.schema';

@Injectable()
export class CommandsService {
  private readonly logger = new Logger(CommandsService.name);

  constructor(private readonly spotifyPlaylist: SpotifyPlaylistService) {}

  private async addToPlaylist(
    message: Message,
    song: TrackEntity,
    songWhip: SongWhip,
  ) {
    try {
      const newSong = await this.spotifyPlaylist.addSong({
        tg_user_id: message.from.id,
        chat_id: message.chat.id,
        name: song.name,
        artists: song.artists,
        url: song.url,
        uri: `${song.id}`,
        spotifyImage: song.thumb_url,
        image: songWhip.image,
      });
      return newSong;
    } catch (error) {}
  }
}
