/**
 * Прямой скрипт для обновления кэша на Contabo VPS
 * Используется как fallback, если HTTP endpoint недоступен
 * Запускается через Node.js напрямую
 */

const cache = require('../api/_lib/cache');
const esimgoClient = require('../api/_lib/esimgo/client');

// Логирование
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

/**
 * Обновить кэш для списка стран
 */
async function refreshCountriesCache() {
    log('🔄 Refreshing countries cache...');
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
        
        log(`✅ Countries cache refreshed: ${countries.length} countries`);
        return { success: true, count: countries.length };
    } catch (error) {
        log(`❌ Error refreshing countries cache: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Обновить кэш для планов (очистить кэш)
 */
async function refreshPlansCache() {
    log('🔄 Refreshing plans cache...');
    const results = {
        cleared: [],
        errors: []
    };
    
    try {
        // Очищаем кэш для Global планов
        try {
            log('🔄 Clearing global plans cache...');
            cache.clear('plans:global');
            results.cleared.push('global');
            log('✅ Global plans cache cleared');
        } catch (error) {
            log(`❌ Error clearing global plans cache: ${error.message}`);
            results.errors.push({ type: 'global', error: error.message });
        }
        
        // Очищаем кэш для Region планов
        const regions = ['Africa', 'Asia', 'Europe', 'North America', 'Latin America', 'Oceania', 'Balkanas', 'Central Eurasia'];
        for (const region of regions) {
            try {
                log(`🔄 Clearing ${region} plans cache...`);
                cache.clear(`region-plans:${region}`);
                results.cleared.push(`region:${region}`);
            } catch (error) {
                log(`❌ Error clearing ${region} plans cache: ${error.message}`);
                results.errors.push({ type: `region:${region}`, error: error.message });
            }
        }
        
        log(`✅ Plans cache cleared: ${results.cleared.length} entries`);
        return { success: true, cleared: results.cleared.length, results };
    } catch (error) {
        log(`❌ Error refreshing plans cache: ${error.message}`);
        return { success: false, error: error.message, results };
    }
}

// Главная функция
async function main() {
    log('🚀 Starting cache refresh process...');
    
    const results = {
        timestamp: new Date().toISOString()
    };
    
    try {
        // Обновляем кэш стран
        results.countries = await refreshCountriesCache();
        
        // Обновляем кэш планов
        results.plans = await refreshPlansCache();
        
        log('✅ Cache refresh completed successfully');
        log(`Results: ${JSON.stringify(results, null, 2)}`);
        
        process.exit(0);
    } catch (error) {
        log(`❌ Cache refresh failed: ${error.message}`);
        log(`Stack: ${error.stack}`);
        process.exit(1);
    }
}

// Запускаем
main();

