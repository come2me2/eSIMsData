/**
 * Endpoint для принудительного обновления кэша
 * Используется cron job для автоматического обновления данных 1 раз в сутки
 * 
 * Endpoint: POST /api/cache/refresh
 * 
 * Параметры (query):
 * - secret: секретный ключ для защиты endpoint (из переменной окружения CACHE_REFRESH_SECRET)
 * - type: тип данных для обновления (countries, plans, regionPlans, globalPlans, all)
 */

const cache = require('../_lib/cache');
const esimgoClient = require('../_lib/esimgo/client');

// Секретный ключ для защиты endpoint от несанкционированного доступа
const CACHE_REFRESH_SECRET = process.env.CACHE_REFRESH_SECRET || 'change-me-in-production';

/**
 * Обновить кэш для списка стран
 *
 * ВАЖНО:
 * Здесь мы ТОЛЬКО очищаем кэш, а не пересобираем список стран.
 * Пересборка выполняется через официальный endpoint `/api/esimgo/countries`,
 * где уже реализована полная фильтрация (исключаются регионы ASIA, CENAM, LATAM, CIS и т.п.).
 * Это гарантирует, что в кэше `countries:all` всегда будут только реальные страны.
 */
async function refreshCountriesCache() {
    console.log('🔄 Refreshing countries cache (clear only, will be rebuilt by /api/esimgo/countries)...');
    try {
        // Просто очищаем кэш; следующий запрос к /api/esimgo/countries пересоберёт список корректно
        cache.clear('countries:all');
        console.log('✅ Countries cache cleared (will be rebuilt lazily)');
        return { success: true, cleared: true };
    } catch (error) {
        console.error('❌ Error clearing countries cache:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Обновить кэш для планов (Local, Global, Region)
 * Очищает кэш, чтобы при следующем запросе данные загрузились заново
 * Это более эффективно, чем загружать все данные здесь
 */
async function refreshPlansCache() {
    console.log('🔄 Refreshing plans cache...');
    const results = {
        cleared: [],
        errors: []
    };
    
    try {
        // Очищаем кэш для Global планов
        try {
            console.log('🔄 Clearing global plans cache...');
            cache.clear('plans:global');
            results.cleared.push('global');
            console.log('✅ Global plans cache cleared');
        } catch (error) {
            console.error('❌ Error clearing global plans cache:', error);
            results.errors.push({ type: 'global', error: error.message });
        }
        
        // Очищаем кэш для Region планов
        const regions = ['Africa', 'Asia', 'Europe', 'North America', 'Latin America', 'Oceania', 'Balkanas', 'Central Eurasia'];
        for (const region of regions) {
            try {
                console.log(`🔄 Clearing ${region} plans cache...`);
                cache.clear(`region-plans:${region}`);
                results.cleared.push(`region:${region}`);
            } catch (error) {
                console.error(`❌ Error clearing ${region} plans cache:`, error);
                results.errors.push({ type: `region:${region}`, error: error.message });
            }
        }
        
        console.log(`✅ Plans cache cleared: ${results.cleared.length} entries`);
        return { success: true, cleared: results.cleared.length, results };
    } catch (error) {
        console.error('❌ Error refreshing plans cache:', error);
        return { success: false, error: error.message, results };
    }
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Проверяем секретный ключ
    // Для Vercel Cron Jobs секрет передается через заголовок
    const secret = req.query.secret || req.headers['x-cache-refresh-secret'] || req.headers['authorization']?.replace('Bearer ', '');
    
    // Если секрет не установлен или равен дефолтному, пропускаем проверку (для разработки)
    // В продакшене обязательно установите CACHE_REFRESH_SECRET
    if (CACHE_REFRESH_SECRET && CACHE_REFRESH_SECRET !== 'change-me-in-production') {
        if (!secret || secret !== CACHE_REFRESH_SECRET) {
            console.warn('⚠️ Unauthorized cache refresh attempt');
            return res.status(401).json({
                success: false,
                error: 'Unauthorized. Provide correct secret key.'
            });
        }
    }
    
    const type = req.query.type || 'all';
    
    console.log(`🔄 Cache refresh requested: type=${type}`);
    
    const results = {
        timestamp: new Date().toISOString(),
        type: type
    };
    
    try {
        if (type === 'countries' || type === 'all') {
            results.countries = await refreshCountriesCache();
        }
        
        if (type === 'plans' || type === 'all') {
            results.plans = await refreshPlansCache();
        }
        
        // Если указан конкретный тип, обновляем только его
        if (type === 'regionPlans' || type === 'globalPlans') {
            results.plans = await refreshPlansCache();
        }
        
        return res.status(200).json({
            success: true,
            message: 'Cache refresh completed',
            results: results
        });
    } catch (error) {
        console.error('❌ Cache refresh error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            results: results
        });
    }
};

