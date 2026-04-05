// PM2 ecosystem config — run with: pm2 start ecosystem.config.cjs
// Install PM2 globally first: npm install -g pm2
//
// Usage:
//   pm2 start ecosystem.config.cjs        # start both processes
//   pm2 stop all                           # stop
//   pm2 restart all                        # restart
//   pm2 logs                               # view logs
//   pm2 save && pm2 startup               # auto-start on system boot

module.exports = {
  apps: [
    {
      name: 'aah-server',
      cwd: './server',
      script: 'npx',
      args: 'tsx watch index.ts',
      interpreter: 'none',
      env: {
        NODE_ENV: 'development',
        PORT: '3001',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
    },
    {
      name: 'aah-client',
      cwd: './client',
      script: 'npx',
      args: 'vite',
      interpreter: 'none',
      env: {
        NODE_ENV: 'development',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
    },
  ],
}
