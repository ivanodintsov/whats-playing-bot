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
  city: string;
  country: string;
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
  access: string;
  artwork_url: string;
  available_country_codes: string[] | null;
  bpm: number;
  comment_count: number;
  commentable: boolean;
  created_at: string;
  description: string;
  download_count: number;
  download_url: string;
  downloadable: boolean;
  duration: number;
  embeddable_by: string;
  favoritings_count: number;
  genre: string;
  id: number;
  isrc: string | null;
  key_signature: string | null;
  kind: string;
  label_name: string;
  license: string;
  metadata_artist: string | null;
  monetization_model: string | null;
  permalink_url: string;
  playback_count: number;
  policy: string | null;
  purchase_title: string;
  purchase_url: string;
  release: string | null;
  release_day: number;
  release_month: number;
  release_year: number;
  reposts_count: number;
  secret_uri: string | null;
  sharing: string;
  stream_url: string;
  streamable: boolean;
  tag_list: string;
  title: string;
  uri: string;
  urn: string;
  user: SoundCloudUser;
  user_favorite: boolean;
  user_playback_count: number | null;
  waveform_url: string;
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
