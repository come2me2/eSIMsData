/**
 * Express Server for eSIMsData API
 * Развертывание на VPS Contabo
 */

const path = require('path');
const fs = require('fs');

// Загружаем переменные окружения из .env файла (явно указываем путь)
// Пробуем несколько путей для надежности
const envPath = path.join(__dirname, '.env');
const envLocalPath = path.join(__dirname, '.env.local');

// Загружаем .env файл
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('✅ Loaded .env from:', envPath);
} else if (fs.existsSync(envLocalPath)) {
    require('dotenv').config({ path: envLocalPath });
    console.log('✅ Loaded .env.local from:', envLocalPath);
} else {
    // Пробуем загрузить без указания пути (dotenv найдет сам)
    require('dotenv').config();
    console.log('⚠️ Loading .env from default location');
}

// Проверяем, что критичные переменные окружения загружены
const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN не найден в переменных окружения!');
    console.error('   Проверьте файл .env в корне проекта');
    console.error('   Путь к .env:', envPath);
    console.error('   Файл существует:', fs.existsSync(envPath));
} else {
    console.log('✅ TELEGRAM_BOT_TOKEN loaded:', botToken.substring(0, 10) + '...');
    // Устанавливаем для совместимости
    if (!process.env.TELEGRAM_BOT_TOKEN && process.env.BOT_TOKEN) {
        process.env.TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN;
    }
}

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Загружаем модуль кэширования
const cache = require('./api/_lib/cache');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Статические файлы из public директории
// Важно: HTML и data-loader.js НЕ кэшируем агрессивно — это позволяет принудительно
// обновлять клиентов (cache reset) и быстрее выкатывать фиксы.
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        const base = path.basename(filePath);
        if (base.endsWith('.html') || base === 'data-loader.js') {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// Статические файлы админ-панели
app.use('/admin', express.static(path.join(__dirname, 'admin'), {
    maxAge: '1h',
    etag: true,
    lastModified: true
}));

// API Routes - eSIM Go endpoints
const apiRoutes = {
    '/api/esimgo/countries': require('./api/esimgo/countries'),
    '/api/esimgo/plans': require('./api/esimgo/plans'),
    '/api/esimgo/region-plans': require('./api/esimgo/region-plans'),
    '/api/esimgo/catalogue': require('./api/_lib/esimgo/catalogue'),
    '/api/esimgo/catalogue-processed': require('./api/esimgo/catalogue-processed'),
    '/api/esimgo/find-bundle': require('./api/esimgo/find-bundle'),
    '/api/esimgo/order': require('./api/esimgo/order'),
    '/api/esimgo/status': require('./api/esimgo/status'),
    '/api/esimgo/assignments': require('./api/esimgo/assignments'),
    '/api/esimgo/test-africa': require('./api/_lib/esimgo/test-africa'),
    '/api/esimgo/test-cyprus': require('./api/_lib/esimgo/test-cyprus'),
    '/api/validate-telegram': require('./api/validate-telegram'),
    '/api/webhook': require('./api/webhook'),
    '/api/cache/refresh': require('./api/cache/refresh'),
    '/api/telegram/stars/create-invoice': require('./api/telegram/stars/create-invoice'),
    '/api/telegram/stars/webhook': require('./api/telegram/stars/webhook'),
    '/api/orders': require('./api/orders'),
    // Admin Panel API
    '/api/admin/auth/login': require('./api/admin/auth'),
    '/api/admin/stats': require('./api/admin/stats'),
    '/api/admin/orders': require('./api/admin/orders'),
    '/api/admin/users': require('./api/admin/users'),
    '/api/admin/settings': require('./api/admin/settings')
};

// Регистрация API routes
Object.entries(apiRoutes).forEach(([route, handler]) => {
    // Специальная обработка для admin auth (только POST для login)
    if (route === '/api/admin/auth/login') {
        app.post(route, async (req, res) => {
            try {
                req.path = '/login';
                await handler(req, res);
            } catch (error) {
                console.error(`Error in ${route}:`, error);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: error.message || 'Internal server error'
                    });
                }
            }
        });
    } else {
        // Поддержка всех методов для каждого endpoint
        app.all(route, async (req, res) => {
            try {
                await handler(req, res);
            } catch (error) {
                console.error(`Error in ${route}:`, error);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: error.message || 'Internal server error'
                    });
                }
            }
        });
    }
    console.log(`✓ Registered route: ${route}`);
});

// Fallback для всех остальных маршрутов - отдаем index.html (SPA)
    // Иначе отдать index.html для SPA
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

/**
 * Прогрев кэша из статических файлов при старте сервера
 * Загружает предгенерированные JSON файлы в memory cache
 */
async function warmupCache() {
    const dataDir = path.join(__dirname, 'public', 'data');
    
    if (!fs.existsSync(dataDir)) {
        console.log('⚠️ No static data directory found. Run: node scripts/generate-static-data.js');
        return;
    }
    
    console.log('🔥 Warming up cache from static files...');
    const startTime = Date.now();
    let loaded = 0;
    
    try {
        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && f !== 'index.json');
        
        for (const file of files) {
            try {
                const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
                const data = JSON.parse(content);
                
                if (data.success && data.data) {
                    // Определяем ключ кэша по имени файла
                    let cacheKey = null;
                    
                    if (file === 'countries.json') {
                        cacheKey = 'countries:all';
                        cache.set(cacheKey, data.data);
                    } else if (file === 'plans-global.json') {
                        cacheKey = 'plans:global';
                        cache.set(cacheKey, { data: data.data, meta: data.meta });
                    } else if (file.startsWith('plans-region-')) {
                        const region = file.replace('plans-region-', '').replace('.json', '')
                            .split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        cacheKey = `plans:region:${region}`;
                        cache.set(cacheKey, { data: data.data, meta: data.meta });
                    } else if (file.startsWith('plans-local-')) {
                        const country = file.replace('plans-local-', '').replace('.json', '').toUpperCase();
                        cacheKey = `plans:local:${country}`;
                        cache.set(cacheKey, { data: data.data, meta: data.meta });
                    }
                    
                    if (cacheKey) {
                        loaded++;
                    }
                }
            } catch (e) {
                console.warn(`⚠️ Failed to load ${file}:`, e.message);
            }
        }
        
        console.log(`✅ Cache warmed up: ${loaded} entries in ${Date.now() - startTime}ms`);
    } catch (error) {
        console.error('❌ Cache warmup failed:', error.message);
    }
}

// Fallback для всех остальных маршрутов - отдаем index.html (SPA)
    // Иначе отдать index.html для SPA
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

/**
 * Прогрев кэша из статических файлов при старте сервера
 * Загружает предгенерированные JSON файлы в memory cache
 */
async function warmupCache() {
    const dataDir = path.join(__dirname, 'public', 'data');
    
    if (!fs.existsSync(dataDir)) {
        console.log('⚠️ No static data directory found. Run: node scripts/generate-static-data.js');
        return;
    }
    
    console.log('🔥 Warming up cache from static files...');
    const startTime = Date.now();
    let loaded = 0;
    
    try {
        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && f !== 'index.json');
        
        for (const file of files) {
            try {
                const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
                const data = JSON.parse(content);
                
                if (data.success && data.data) {
                    // Определяем ключ кэша по имени файла
                    let cacheKey = null;
                    
                    if (file === 'countries.json') {
                        cacheKey = 'countries:all';
                        cache.set(cacheKey, data.data);
                    } else if (file === 'plans-global.json') {
                        cacheKey = 'plans:global';
                        cache.set(cacheKey, { data: data.data, meta: data.meta });
                    } else if (file.startsWith('plans-region-')) {
                        const region = file.replace('plans-region-', '').replace('.json', '')
                            .split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        cacheKey = `plans:region:${region}`;
                        cache.set(cacheKey, { data: data.data, meta: data.meta });
                    } else if (file.startsWith('plans-local-')) {
                        const country = file.replace('plans-local-', '').replace('.json', '').toUpperCase();
                        cacheKey = `plans:local:${country}`;
                        cache.set(cacheKey, { data: data.data, meta: data.meta });
                    }
                    
                    if (cacheKey) {
                        loaded++;
                    }
                }
            } catch (e) {
                console.warn(`⚠️ Failed to load ${file}:`, e.message);
            }
        }
        
        console.log(`✅ Cache warmed up: ${loaded} entries in ${Date.now() - startTime}ms`);
    } catch (error) {
        console.error('❌ Cache warmup failed:', error.message);
    }
}

// Запуск сервера
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
    console.log(`🔑 ESIMGO_API_KEY: ${process.env.ESIMGO_API_KEY ? '✓ Set' : '✗ Not set'}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`\n📋 Available API endpoints:`);
    Object.keys(apiRoutes).forEach(route => {
        console.log(`   ${route}`);
    });
    
    // Прогреваем кэш после старта сервера
    await warmupCache();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});

// Fallback для всех остальных маршрутов - отдаем index.html (SPA)
app.get('*', (req, res) => {
    // Если это API запрос, вернуть 404
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            error: 'API endpoint not found'
        });
    }
    
    // Пропускаем запросы к админке - они обрабатываются статическими файлами
    if (req.path.startsWith('/admin/')) {
        return res.status(404).json({
            success: false,
            error: 'Admin file not found'
        });
    }
    
    // Специальная обработка для checkout.html - не кэшируем
    if (req.path === '/checkout.html' || req.path === '/checkout') {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return res.sendFile(path.join(__dirname, 'public', 'checkout.html'));
    }
    
    // Иначе отдать index.html для SPA
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

/**
 * Прогрев кэша из статических файлов при старте сервера
 * Загружает предгенерированные JSON файлы в memory cache
 */
async function warmupCache() {
    const dataDir = path.join(__dirname, 'public', 'data');
    
    if (!fs.existsSync(dataDir)) {
        console.log('⚠️ No static data directory found. Run: node scripts/generate-static-data.js');
        return;
    }
    
    console.log('🔥 Warming up cache from static files...');
    const startTime = Date.now();
    let loaded = 0;
    
    try {
        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && f !== 'index.json');
        
        for (const file of files) {
            try {
                const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
                const data = JSON.parse(content);
                
                if (data.success && data.data) {
                    // Определяем ключ кэша по имени файла
                    let cacheKey = null;
                    
                    if (file === 'countries.json') {
                        cacheKey = 'countries:all';
                        cache.set(cacheKey, data.data);
                    } else if (file === 'plans-global.json') {
                        cacheKey = 'plans:global';
                        cache.set(cacheKey, { data: data.data, meta: data.meta });
                    } else if (file.startsWith('plans-region-')) {
                        const region = file.replace('plans-region-', '').replace('.json', '')
                            .split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        cacheKey = `plans:region:${region}`;
                        cache.set(cacheKey, { data: data.data, meta: data.meta });
                    } else if (file.startsWith('plans-local-')) {
                        const country = file.replace('plans-local-', '').replace('.json', '').toUpperCase();
                        cacheKey = `plans:local:${country}`;
                        cache.set(cacheKey, { data: data.data, meta: data.meta });
                    }
                    
                    if (cacheKey) {
                        loaded++;
                    }
                }
            } catch (e) {
                console.warn(`⚠️ Failed to load ${file}:`, e.message);
            }
        }
        
        console.log(`✅ Cache warmed up: ${loaded} entries in ${Date.now() - startTime}ms`);
    } catch (error) {
        console.error('❌ Cache warmup failed:', error.message);
    }
}


