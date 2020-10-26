import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SpotifyChatPlaylist, SpotifyChatPlaylistDocument } from 'src/schemas/chat-playlist.schema';
import { SpotifyPlaylist, SpotifyPlaylistDocument } from 'src/schemas/playlist.schema';

@Injectable()
export class SpotifyPlaylistService {
  constructor (
    @InjectModel(SpotifyPlaylist.name) private spotifyPlaylist: Model<SpotifyPlaylistDocument>,
    @InjectModel(SpotifyChatPlaylist.name) private spotifyChatPlaylist: Model<SpotifyChatPlaylistDocument>,
  ) {}

  async addSong(song: SpotifyPlaylist) {
    const newChatSong = new this.spotifyChatPlaylist(song);
    const newSong = new this.spotifyPlaylist(song);

    await newChatSong.save();
    await newSong.save();
    return newSong;
  }
}
