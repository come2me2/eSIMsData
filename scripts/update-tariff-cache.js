#!/usr/bin/env node
/**
 * Скрипт для обновления кэша тарифов на сервере
 * 
 * Использование:
 *   node scripts/update-tariff-cache.js [server-url]
 * 
 * Примеры:
 *   node scripts/update-tariff-cache.js                    # localhost:3000
 *   node scripts/update-tariff-cache.js http://localhost:3000
 *   node scripts/update-tariff-cache.js https://your-domain.com
 */

require('dotenv').config();
const http = require('http');
const https = require('https');

// Параметры
const SERVER_URL = process.argv[2] || process.env.DOMAIN || 'http://localhost:3000';
const SECRET = process.env.CACHE_REFRESH_SECRET || 'change-me-in-production';

// Логирование
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

// Функция для выполнения HTTP запроса
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };
        
        const req = client.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        statusCode: res.statusCode,
                        data: jsonData
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        data: data
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

// Обновление кэша через API endpoint
async function refreshCacheViaAPI() {
    log(`🔄 Обновление кэша тарифов через API: ${SERVER_URL}`);
    
    try {
        // Сначала очищаем кэш
        log('📤 Очистка старого кэша...');
        const refreshUrl = `${SERVER_URL}/api/cache/refresh?secret=${SECRET}&type=all`;
        const refreshResponse = await makeRequest(refreshUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (refreshResponse.statusCode === 200) {
            log('✅ Кэш успешно очищен');
            log(`   Ответ: ${JSON.stringify(refreshResponse.data, null, 2)}`);
        } else {
            log(`⚠️ Очистка кэша вернула код: ${refreshResponse.statusCode}`);
            log(`   Ответ: ${JSON.stringify(refreshResponse.data, null, 2)}`);
        }
        
        // Затем предзаполняем кэш
        log('\n📤 Предзаполнение кэша актуальными данными...');
        const prefillUrl = `${SERVER_URL}/api/cache/prefill?secret=${SECRET}`;
        const prefillResponse = await makeRequest(prefillUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (prefillResponse.statusCode === 200) {
            log('✅ Кэш успешно предзаполнен');
            log(`   Ответ: ${JSON.stringify(prefillResponse.data, null, 2)}`);
            return true;
        } else {
            log(`❌ Предзаполнение кэша вернуло код: ${prefillResponse.statusCode}`);
            log(`   Ответ: ${JSON.stringify(prefillResponse.data, null, 2)}`);
            return false;
        }
    } catch (error) {
        log(`❌ Ошибка при обновлении кэша через API: ${error.message}`);
        return false;
    }
}

// Главная функция
async function main() {
    log('🚀 Запуск обновления кэша тарифов...');
    log(`📍 Сервер: ${SERVER_URL}`);
    log(`🔑 Секрет: ${SECRET.substring(0, 10)}...`);
    log('');
    
    const success = await refreshCacheViaAPI();
    
    if (success) {
        log('\n✅ Кэш тарифов успешно обновлен!');
        process.exit(0);
    } else {
        log('\n❌ Не удалось обновить кэш тарифов');
        log('\n💡 Альтернативные способы:');
        log('   1. Убедитесь, что сервер запущен');
        log('   2. Проверьте правильность URL сервера');
        log('   3. Проверьте переменную окружения CACHE_REFRESH_SECRET');
        log('   4. Запустите напрямую: npm run prefill-cache');
        process.exit(1);
    }
}

// Запуск
main();






