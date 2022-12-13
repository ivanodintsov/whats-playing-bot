import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import {
  SpotifyChatPlaylist,
  SpotifyChatPlaylistDocument,
} from 'src/schemas/chat-playlist.schema';
import {
  SpotifyPlaylist,
  SpotifyPlaylistDocument,
} from 'src/schemas/playlist.schema';
import { SongInfo, SongInfoDocument } from 'src/schemas/song-info.schema';

@Injectable()
export class SpotifyPlaylistService {
  constructor(
    @InjectModel(SpotifyPlaylist.name)
    private spotifyPlaylist: Model<SpotifyPlaylistDocument>,
    @InjectModel(SpotifyChatPlaylist.name)
    private spotifyChatPlaylist: Model<SpotifyChatPlaylistDocument>,
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
      await this.songInfo.findOneAndUpdate(
        { uri: song.uri },
        { $inc: { shareCount: 1 } },
        {
          new: true,
          upsert: true,
        },
      );
    } catch (error) {}
  }

  getLastChatTracks(chatId: number, limit: number) {
    return this.spotifyChatPlaylist
      .find({ chat_id: chatId })
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  getLastTracks(limit: number) {
    return this.spotifyChatPlaylist
      .find()
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  async getPaginatedTracks(limit: number, cursor?: string) {
    const query: FilterQuery<SpotifyChatPlaylistDocument> = {};

    if (cursor) {
      query._id = {
        $lt: cursor,
      };
    }

    const data = await this.spotifyChatPlaylist
      .find(query)
      .limit(limit + 1)
      .sort({ createdAt: -1 });

    return this.createListWithNextItem(data, limit);
  }

  async getPaginatedTracksByPage(perPage: number, page = 1) {
    const query: FilterQuery<SpotifyChatPlaylistDocument> = {};
    const skipMultiplier = page - 1;

    const data = await this.spotifyChatPlaylist
      .find(query)
      .skip(skipMultiplier * perPage)
      .limit(perPage + 1)
      .sort({ createdAt: -1 });

    return this.createListWithNextItem(data, perPage);
  }

  private createListWithNextItem(list: SpotifyChatPlaylist[], limit: number) {
    let data = list;
    let nextItem: SpotifyChatPlaylist | undefined;

    if (list?.length > limit - 1) {
      data = data.slice(0, -1);
      nextItem = data[data.length - 1];
    }

    return {
      data,
      nextItem,
    };
  }

  async getPreviousCursor(
    limit: number,
    cursor?: string,
  ): Promise<string | null> {
    const query: FilterQuery<SpotifyChatPlaylistDocument> = {};

    if (cursor) {
      query._id = {
        $gt: cursor,
      };
    }

    const data = await this.spotifyChatPlaylist
      .find(query)
      .select({ _id: 1 })
      .limit(limit)
      .sort({ createdAt: 1 });

    if (!data) {
      return;
    }

    return data[data.length - 1]?._id;
  }

  getSongInfo(uris: string[]) {
    return this.songInfo.find({
      uri: {
        $in: uris,
      },
    });
  }
}
