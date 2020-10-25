import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SpotifyPlaylist, SpotifyPlaylistDocument } from 'src/schemas/playlist.schema';

@Injectable()
export class SpotifyPlaylistService {
  constructor (
    @InjectModel(SpotifyPlaylist.name) private spotifyPlaylist: Model<SpotifyPlaylistDocument>,
  ) {}

  async addSong(song: SpotifyPlaylist) {
    const newSong = new this.spotifyPlaylist(song);
    await newSong.save()
    return newSong;
  }
}
