import axios from 'axios';

const request = axios.create({
  baseURL: 'https://api.tidalhifi.com/v1',
});

/**
 * Authentication information (username and password)
 * @type {Object}
 * @private
 */
let authInfo;

/**
 * TIDAL API Session ID
 * @type {null|String}
 * @private
 */
let _sessionID = null;

/**
 * TIDAL API Country code
 * @type {null|String}
 * @private
 */
let _countryCode = null;

/**
 * TIDAL API User ID
 * @type {null|String}
 * @private
 */
let _userID = null;

/**
 * TIDAL API stream quality
 * @type {null|String}
 * @private
 */
let _streamQuality = null;

/**
 * api logged in
 * @type {null|String}
 */
let loggedIn = false;

/**
 * authData
 * @type {Object}
 */

export class TidalAPI {
  authData: any = {};

  constructor(authData) {
    if (typeof authData !== 'object') {
      throw new Error(
        'You must pass auth data into the TidalAPI object correctly',
      );
    } else {
      if (typeof authData.username !== 'string') {
        throw new Error('Username invalid or missing');
      }
      if (typeof authData.password !== 'string') {
        throw new Error('Password invalid or missing');
      }
      // if (typeof authData.token !== 'string') {
      //   throw new Error('Token invalid or missing');
      // }
      if (typeof authData.quality !== 'string') {
        throw new Error('Stream quality invalid or missing');
      }
    }

    this.authData = authData;
  }

  /**
   * Return userID.
   */
  getMyID() {
    return _userID;
  }
  /**
   * Global search.
   * @param {{query: String, limit: Number, types: String, offset: Number}}
   */
  search(query, callback) {
    this._baseRequest(
      '/search',
      {
        query: query.query || query,
        limit: query.limit || 999,
        types: query.type || 'ARTISTS,ALBUMS,TRACKS,VIDEOS,PLAYLISTS',
        offset: query.offset || 0,
        countryCode: _countryCode,
      },
      'search',
      callback,
    );
  }
  /**
   * Get artist info.
   * @param {{id: Number, limit: Number, filter: String, offset: Number}}
   */
  getArtist(query, callback) {
    this._baseRequest(
      '/artists/' + (query.id || query),
      {
        limit: query.limit || 999,
        filter: query.filter || 'ALL',
        offset: query.offset || 0,
        countryCode: _countryCode,
      },
      'artist',
      callback,
    );
  }
  /**
   * Get artist top tracks.
   * @param {{id: Number, limit: Number, filter: String, offset: Number}}
   */
  getTopTracks(query, callback) {
    this._baseRequest(
      '/artists/' + (query.id || query) + '/toptracks',
      {
        limit: query.limit || 999,
        filter: query.filter || 'ALL',
        offset: query.offset || 0,
        countryCode: _countryCode,
      },
      'toptracks',
      callback,
    );
  }
  /**
   * Get artist videos.
   * @param {{id: Number, limit: Number, filter: String, offset: Number}}
   */
  getArtistVideos(query, callback) {
    this._baseRequest(
      '/artists/' + (query.id || query) + '/videos',
      {
        limit: query.limit || 999,
        filter: query.filter || 'ALL',
        offset: query.offset || 0,
        countryCode: _countryCode,
      },
      'videos',
      callback,
    );
  }
  /**
   * Get artist bio.
   * @param {{id: Number}}
   */
  getArtistBio(query, callback) {
    this._baseRequest(
      '/artists/' + (query.id || query) + '/bio',
      {
        countryCode: _countryCode,
      },
      'bio',
      callback,
    );
  }
  /**
   * Get similar artists.
   * @param {{id: Number, limit: Number, filter: String, offset: Number}}
   */
  getSimilarArtists(query, callback) {
    this._baseRequest(
      '/artists/' + (query.id || query) + '/similar',
      {
        limit: query.limit || 999,
        filter: query.filter || 'ALL',
        offset: query.offset || 0,
        countryCode: _countryCode,
      },
      'similar',
      callback,
    );
  }
  /**
   * Get artist albums.
   * @param {{id: Number, limit: Number, filter: String, offset: Number}}
   */
  getArtistAlbums(query, callback) {
    this._baseRequest(
      '/artists/' + (query.id || query) + '/albums',
      {
        limit: query.limit || 999,
        filter: query.filter || 'ALL',
        offset: query.offset || 0,
        countryCode: _countryCode,
      },
      'albums',
      callback,
    );
  }
  /**
   * Get album info.
   * @param {{id: Number, limit: Number, filter: String, offset: Number}}
   */
  getAlbum(query, callback) {
    this._baseRequest(
      '/albums/' + (query.id || query),
      {
        limit: query.limit || 999,
        filter: query.filter || 'ALL',
        offset: query.offset || 0,
        countryCode: _countryCode,
      },
      'album',
      callback,
    );
  }
  /**
   * Get album tracks.
   * @param {{id: Number, limit: Number, filter: String, offset: Number}}
   */
  getAlbumTracks(query, callback) {
    this._baseRequest(
      '/albums/' + (query.id || query) + '/tracks',
      {
        limit: query.limit || 999,
        filter: query.filter || 'ALL',
        offset: query.offset || 0,
        countryCode: _countryCode,
      },
      'albums',
      callback,
    );
  }
  /**
   * Get playlist info.
   * @param {{id: String, limit: Number, filter: String, offset: Number}}
   */
  getPlaylist(query, callback) {
    this._baseRequest(
      '/playlists/' + (query.id || query),
      {
        limit: query.limit || 999,
        filter: query.filter || 'ALL',
        offset: query.offset || 0,
        countryCode: _countryCode,
      },
      'album',
      callback,
    );
  }
  /**
   * Get tracks from a playlist.
   * @param {{id: String, limit: Number, filter: String, offset: Number}}
   */
  getPlaylistTracks(query, callback) {
    this._baseRequest(
      '/playlists/' + (query.id || query) + '/tracks',
      {
        limit: query.limit || 999,
        filter: query.filter || 'ALL',
        offset: query.offset || 0,
        countryCode: _countryCode,
      },
      'albums',
      callback,
    );
  }
  /**
   * Get track info.
   * @param {{id: Number, quality: String}}
   */
  getTrackInfo(track, callback) {
    this._baseRequest(
      '/tracks/' + (track.id || track),
      {
        countryCode: _countryCode,
      },
      'trackInfo',
      callback,
    );
  }
  /**
   * Get track stream URL.
   * @param {{id: Number, quality: String}}
   */
  getStreamURL(track, callback) {
    this._baseRequest(
      '/tracks/' + (track.id || track) + '/streamUrl',
      {
        soundQuality: track.quality || _streamQuality,
        countryCode: _countryCode,
      },
      'streamURL',
      callback,
    );
  }
  /**
   * Get track stream URL.
   * @param {{id: Number, quality: String}}
   */
  getOfflineURL(track, callback) {
    this._baseRequest(
      '/tracks/' + (track.id || track) + '/offlineUrl',
      {
        soundQuality: track.quality || _streamQuality,
        countryCode: _countryCode,
      },
      'streamURL',
      callback,
    );
  }
  /**
   * Get video stream URL.
   * @param {{id: Number}}
   */
  getVideoStreamURL(track, callback) {
    this._baseRequest(
      '/videos/' + (track.id || track) + '/streamUrl',
      {
        countryCode: _countryCode,
      },
      'streamURL',
      callback,
    );
  }
  /**
   * Get user info.
   * @param {{id: Number}}
   */
  getUser(user, callback) {
    this._baseRequest(
      '/users/' + (user.id || user),
      {
        limit: user.limit || 999,
        offset: user.offset || 0,
      },
      'user',
      callback,
    );
  }
  /**
   * Get user playlists.
   * @param {{id: Number}}
   */
  getPlaylists(user, callback) {
    this._baseRequest(
      '/users/' + (user.id || user) + '/playlists',
      {
        limit: user.limit || 999,
        offset: user.offset || 0,
        countryCode: _countryCode,
      },
      'userPlaylists',
      callback,
    );
  }

  /**
   * Get track stream URL.
   * @param {id: String, res: Number}
   */

  getArtURL(id, width, height) {
    width = width || 1280;
    height = height || 1280;
    return (
      'https://resources.tidal.com/images/' +
      id.replace(/-/g, '/') +
      '/' +
      width +
      'x' +
      height +
      '.jpg'
    );
  }
  /**
   * Generate Metaflac tags.
   * @param {{id: Number}}
   */
  genMetaflacTags(track, callback) {
    this.getTrackInfo({ id: track.id || track }, data => {
      this.getAlbum({ id: data.album.id }, albumData => {
        let metaflacTag;
        metaflacTag = '--remove-all-tags ';
        metaflacTag += '--set-tag="ARTIST=' + data.artist.name + '" ';
        metaflacTag += '--set-tag="TITLE=' + data.title + '" ';
        metaflacTag += '--set-tag="ALBUM=' + data.album.title + '" ';
        metaflacTag += '--set-tag="TRACKNUMBER=' + data.trackNumber + '" ';
        metaflacTag += '--set-tag="COPYRIGHT=' + data.copyright + '" ';
        metaflacTag +=
          '-set-tag="DATE=' + albumData.releaseDate.split('-')[0] + '" ';
        if (track.coverPath) {
          metaflacTag +=
            '--import-picture-from=' + '"' + track.coverPath + '" ';
        }
        if (track.songPath) {
          metaflacTag += '"' + track.songPath + '" ';
        }
        metaflacTag += '--add-replay-gain';
        callback(metaflacTag);
      });
    });
  }
  /**
   * Base request function.
   * @param {{method: String, params: Object, type: String, callback: Function}}
   */
  _baseRequest = async function(method, params, type, callback) {
    if (!loggedIn) {
      return tryLogin(this.authData, () => {
        this._baseRequest(method, params, type, callback);
      });
    }

    params.countryCode = params.countryCode ? params.countryCode : _countryCode;

    const response = await request.request({
      url: method,
      headers: {
        Origin: 'http://listen.tidal.com',
        'X-Tidal-SessionId': _sessionID,
      },
      params,
    });

    const body = response.data;
    if (params.types) {
      const newBody = {};
      if (params.types.indexOf('tracks') > -1) {
        newBody['tracks'] = body.tracks;
      }
      if (params.types.indexOf('artists') > -1) {
        newBody['artists'] = body.artists;
      }
      if (params.types.indexOf('albums') > -1) {
        newBody['albums'] = body.albums;
      }
      if (params.types.indexOf('videos') > -1) {
        newBody['videos'] = body.videos;
      }
      if (params.types.indexOf('playlists') > -1) {
        newBody['playlists'] = body.playlists;
      }
      callback(newBody);
    } else callback(body);
  };
}

/**
 * Try login using credentials.
 * @param {{username: String, password: String}}
 */
async function tryLogin(authInfo, cb) {
  /**
   * Logging?
   * @type {boolean}
   */
  let loggingIn = true;

  try {
    const response = await request.request({
      method: 'POST',
      url: '/login/username',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams({
        username: authInfo.username,
        password: authInfo.password,
      }),
    });

    const data = response.data;

    _sessionID = data.sessionId;
    _userID = data.userId;
    _countryCode = data.countryCode;
    _streamQuality = authInfo.quality;
    loggingIn = false;
    loggedIn = true;

    cb();
  } catch (error) {
    console.log(error);
  }
}
