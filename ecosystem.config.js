/**
 * PM2 Ecosystem Configuration
 * Загружает переменные окружения из .env файла
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

module.exports = {
    apps: [{
        name: 'esimsdata',
        script: './server.js',
        cwd: '/var/www/esimsdata',
        instances: 1,
        exec_mode: 'fork',
        env: {
            NODE_ENV: 'production',
            PORT: process.env.PORT || 3000,
            TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
            ESIMGO_API_KEY: process.env.ESIMGO_API_KEY,
            STARS_RATE: process.env.STARS_RATE || '0.013',
            STARS_MARGIN: process.env.STARS_MARGIN || '0.29',
            STARS_TELEGRAM_FEE: process.env.STARS_TELEGRAM_FEE || '0.25',
            TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET
        },
        error_file: '/var/www/esimsdata/logs/pm2-error.log',
        out_file: '/var/www/esimsdata/logs/pm2-out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        min_uptime: '60s',
        max_restarts: 3,
        restart_delay: 10000,
        listen_timeout: 10000,
        kill_timeout: 10000,
        wait_ready: true,
        exp_backoff_restart_delay: 100
    }]
};
