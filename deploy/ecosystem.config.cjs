/**
 * PM2 — qau.ironslash.com (Hecho en Saltillo)
 * Ruta del proyecto: /home/ivanam/projects/rd
 *
 *   cd /home/ivanam/projects/rd
 *   npm install
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save
 */

const root = '/home/ivanam/projects/rd';

module.exports = {
  apps: [
    {
      name: 'qau-api',
      cwd: root,
      script: 'proxy-server.js',
      autorestart: true,
      max_restarts: 15,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
    {
      name: 'qau-shazam',
      cwd: root,
      script: 'shazam-automation.js',
      autorestart: true,
      max_restarts: 15,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
