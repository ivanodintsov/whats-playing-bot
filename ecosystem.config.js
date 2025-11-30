module.exports = {
  apps: [
    {
      name: 'sharemusic-app',
      script: 'dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '450M',
      env: {
        NODE_ENV: 'production',
      },
      node_args: [
        '--gc-interval=100',
        '--max-old-space-size=1024',
        '--heapsnapshot-signal=SIGUSR2',
        '--optimize-for-size',
      ].join(' '),
      env_production: {
        UV_THREADPOOL_SIZE: 4,
      },
    },
  ],
};
