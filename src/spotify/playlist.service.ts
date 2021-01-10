import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SpotifyChatPlaylist, SpotifyChatPlaylistDocument } from 'src/schemas/chat-playlist.schema';
import { SpotifyPlaylist, SpotifyPlaylistDocument } from 'src/schemas/playlist.schema';
import { SongInfo, SongInfoDocument } from 'src/schemas/song-info.schema';

@Injectable()
export class SpotifyPlaylistService {
  constructor (
    @InjectModel(SpotifyPlaylist.name) private spotifyPlaylist: Model<SpotifyPlaylistDocument>,
    @InjectModel(SpotifyChatPlaylist.name) private spotifyChatPlaylist: Model<SpotifyChatPlaylistDocument>,
    @InjectModel(SongInfo.name) private songInfo: Model<SongInfoDocument>,
  ) {}

  async addSong(song: SpotifyPlaylist) {
    const newChatSong = new this.spotifyChatPlaylist(song);
    const newSong = new this.spotifyPlaylist(song);

    await this.updateShareData(song);
    await newChatSong.save();
    await newSong.save();

    return newSong;
  }

  private async updateShareData(song: SpotifyPlaylist) {
    try {
      await this.songInfo.findOneAndUpdate({ uri: song.uri }, { $inc: { shareCount: 1 } }, {
        new: true,
        upsert: true,
      });
    } catch (error) {
    }
  }

  getLastChatTracks(chatId: number, limit: number) {
    return this.spotifyChatPlaylist.find({ chat_id: chatId }).limit(limit).sort({ createdAt: -1 });
  }

  getLastTracks(limit: number) {
    return this.spotifyChatPlaylist.find().limit(limit).sort({ createdAt: -1 });
  }

  getSongInfo(uris: string[]) {
    return this.songInfo.find({
      uri: {
        $in: uris,
      },
    });;
  }
}
