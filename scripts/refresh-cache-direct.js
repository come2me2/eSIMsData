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
 *
 * ВАЖНО:
 * Этот скрипт больше НЕ пересобирает список стран самостоятельно, чтобы не допустить
 * появления регионов (ASIA, CENAM, LATAM, CIS и др.) в списке стран.
 * Теперь он только очищает кэш, а пересборка выполняется через endpoint
 * `/api/esimgo/countries`, где уже реализована полная фильтрация.
 */
async function refreshCountriesCache() {
    log('🔄 Refreshing countries cache (clear only, will be rebuilt by /api/esimgo/countries)...');
    try {
        // Просто очищаем кэш; следующий запрос к /api/esimgo/countries пересоберёт список корректно
        cache.clear('countries:all');
        log('✅ Countries cache cleared (will be rebuilt lazily)');
        return { success: true, cleared: true };
    } catch (error) {
        log(`❌ Error clearing countries cache: ${error.message}`);
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


