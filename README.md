<p align="center">
  <a href="https://spotify.odintsov.me/" target="blank">
    <img src="docs/public/spotify-bot-logo.png" width="125" height='125' alt="What's Playing Bot Logo" />
  </a>
</p>

<p align='center'><b>What's Playing Bot</b></p>
<p align="center">Share, play, and add the Spotify songs to the queue<br/>
just in one click. Let the magic happens.</p>

## Description

The Telegram bot to share current playing track and control spotify.

### Available commands

- /share - Share current track
- /s - Share current track
- /ss - Share current track without control buttons
- /next - Next track
- /previous - Previous track
- /me - Share profile link
- /unlink_spotify - Unlink

Inline query is also supported

<img src="docs/public/inline-query.png" width="400" height='136' alt="What's Playing Bot Inline Query Screenshot" />

## Installation

```bash
$ yarn install
```

## Running the app

```bash
# development
$ yarn start

# watch mode
$ yarn start:dev

# production mode
$ yarn start:prod
```

## Environment variables

- `SPOTIFY_CLIENT_ID` - Get in [developer.spotify.com](https://developer.spotify.com/dashboard).
- `SPOTIFY_CLIENT_SECRET` - Get in [developer.spotify.com](https://developer.spotify.com/dashboard).
- `SPOTIFY_REDIRECT_URL` - The url to redirect to after the user grants or denies permission.
- `MONGO_URI` - MongoDB database url.
- `TELEGRAM_BOT_TOKEN` - Get it by contacting to [BotFather](https://t.me/BotFather).
- `JWT_SECRET` - JWT secret key.
- `TELEGRAM_JWT_SECRET` - JWT secret key.
- `TELEGRAM_SPOTIFY_CALLBACK_URI` - Callback url.
- `TELEGRAM_BOT_NAME` - Telegram bot username.
- `SITE` - Backend url.
- `FRONTEND_URL` - Frontend url.
- `FRONTEND_TITLE` - Frontend title.
- `FRONTEND_DESCRIPTION` - Frontend description.
- `BOT_LOGO_IMAGE` - Bot logo/
- `DEFAULT_COVER_IMAGE` - Default track cover.

## Related

- [NestJS](https://github.com/nestjs/nest) - About
  A progressive Node.js framework for building efficient, scalable, and enterprise-grade server-side applications on top of TypeScript & JavaScript (ES6, ES7, ES8) 🚀
- [telegraf.js](https://github.com/telegraf/telegraf) - Modern Telegram Bot API framework for Node.js
