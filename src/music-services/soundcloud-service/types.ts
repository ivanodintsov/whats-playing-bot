import { Pagination } from '../music-service-core/types';

export type SoundcloudApiMeResponse = {
  id: number;
  avatar_url: string;
  city: string;
  country: string;
  created_at: string;
  description: string;
  discogs_name: string;
  first_name: string;
  followers_count: number;
  followings_count: number;
  full_name: string;
  urn: string;
  kind: string;
  last_modified: string;
  last_name: string;
  likes_count: number;
  locale: string;
  online: boolean;
  permalink: string;
  permalink_url: string;
  plan: string;
  playlist_count: number;
  primary_email_confirmed: boolean;
  private_playlists_count: number;
  private_tracks_count: number;
  public_favorites_count: number;
  quota: {
    unlimited_upload_quota: boolean;
    upload_seconds_used: number;
    upload_seconds_left: number;
  };
  reposts_count: number;
  subscriptions: [
    {
      product: {
        id: string;
        name: string;
      };
      recurring: boolean;
    },
  ];
  track_count: number;
  upload_seconds_left: number;
  uri: string;
  username: string;
  website: string;
  website_title: string;
};

export interface SoundCloudUser {
  avatar_url: string;
  city: string | null;
  country: string | null;
  created_at: string;
  description: string;
  discogs_name: string | null;
  first_name: string;
  followers_count: number;
  followings_count: number;
  full_name: string;
  id: number;
  urn: string;
  kind: string;
  last_modified: string;
  last_name: string;
  likes_count: number;
  online: boolean;
  permalink: string;
  permalink_url: string;
  plan: string;
  playlist_count: number;
  public_favorites_count: number;
  reposts_count: number;
  track_count: number;
  uri: string;
  username: string;
  website: string | null;
  website_title: string | null;
  comments_count: number;
  myspace_name: string | null;
}

export interface SoundCloudTrack {
  access: string | null;
  artwork_url: string;
  available_country_codes: string[] | null;
  bpm: number | null;
  comment_count: number;
  commentable: boolean;
  created_at: string;
  description: string;
  download_count: number;
  download_url: string | null;
  downloadable: boolean;
  duration: number;
  embeddable_by: string;
  favoritings_count: number;
  genre: string;
  id: number;
  isrc: string | null;
  key_signature: string | null;
  kind: string;
  label_name: string | null;
  license: string | null;
  metadata_artist: string | null;
  monetization_model: string | null;
  permalink_url: string;
  playback_count: number;
  policy: string | null;
  purchase_title: string | null;
  purchase_url: string | null;
  release: string | null;
  release_day: number | null;
  release_month: number | null;
  release_year: number | null;
  reposts_count: number | null;
  secret_uri: string | null;
  sharing: string | null;
  stream_url: string | null;
  streamable: boolean;
  tag_list: string;
  title: string;
  uri: string;
  urn: string;
  user: SoundCloudUser;
  user_favorite: boolean | null;
  user_playback_count: number | null;
  waveform_url: string | null;
}

export interface SoundCloudPlaylist {
  artwork_url: string;
  created_at: string;
  description: string;
  downloadable: boolean;
  duration: number;
  ean: string;
  embeddable_by: string;
  genre: string;
  id: number;
  kind: string;
  label: SoundCloudUser | null;
  label_id: number | null;
  label_name: string;
  last_modified: string;
  license: string;
  likes_count: number;
  permalink: string;
  permalink_url: string;
  playlist_type: string;
  purchase_title: string;
  purchase_url: string;
  release: string;
  release_day: number;
  release_month: number;
  release_year: number;
  sharing: string;
  streamable: boolean;
  tag_list: string;
  tags: string | null;
  title: string;
  track_count: number;
  tracks: SoundCloudTrack[];
  tracks_uri: string | null;
  type: 'playlist';
  uri: string;
  urn: string;
  user: SoundCloudUser;
  user_id: number;
  user_urn: string;
}

export interface SoundCloudTrackStream {
  hls_aac_160_url: string;
  hls_aac_96_url: string;
  preview_mp3_128_url: string;
}

export type SoundCloudPaginatedResponse<T> = {
  collection: T[];
  next_href: string;
};

export type SoundcloudApiResolveUrlResponse = SoundCloudTrack;

export type SoundcloudApiMeRecentlyPlayedTracks = {
  collection: SoundCloudTrack[];
};

export type SoundcloudApiSearchTracks =
  SoundCloudPaginatedResponse<SoundCloudTrack>;

export type SoundcloudApiSearchPlaylists =
  SoundCloudPaginatedResponse<SoundCloudPlaylist>;

export type SoundcloudApiSearchUsers =
  SoundCloudPaginatedResponse<SoundCloudUser>;

export type SearchPlaylistsResponse = {
  playlists: SoundCloudPlaylist[];
} & Pagination;

export type SearchUsersResponse = {
  users: SoundCloudUser[];
} & Pagination;
