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
 */
async function refreshCountriesCache() {
    console.log('🔄 Refreshing countries cache...');
    try {
        // Очищаем старый кэш
        cache.clear('countries:all');
        
        // Загружаем данные из API
        const catalogue = await esimgoClient.getCatalogue(null, {
            perPage: 1000,
            page: 1
        });
        
        const bundles = Array.isArray(catalogue) 
            ? catalogue 
            : (catalogue?.bundles || catalogue?.data || []);
        
        // Извлекаем уникальные страны
        const countriesMap = new Map();
        bundles.forEach(bundle => {
            const countries = bundle.countries || [];
            countries.forEach(country => {
                let countryCode = null;
                if (typeof country === 'string') {
                    countryCode = country.toUpperCase();
                } else if (typeof country === 'object' && country !== null) {
                    countryCode = (country.iso || country.ISO || country.code || '').toUpperCase();
                }
                
                if (countryCode && countryCode.length >= 2 && countryCode.length <= 5) {
                    if (!countriesMap.has(countryCode)) {
                        countriesMap.set(countryCode, {
                            code: countryCode,
                            name: typeof country === 'string' ? country : (country.name || country.Name || countryCode)
                        });
                    }
                }
            });
        });
        
        const countries = Array.from(countriesMap.values());
        
        // Сохраняем в кэш
        cache.set('countries:all', countries);
        
        console.log(`✅ Countries cache refreshed: ${countries.length} countries`);
        return { success: true, count: countries.length };
    } catch (error) {
        console.error('❌ Error refreshing countries cache:', error);
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

