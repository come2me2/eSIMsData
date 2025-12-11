/**
 * Скрипт для полного сброса и перезаполнения кэша
 * Использование: node scripts/reset-and-refill-cache.js
 */

const cache = require('../api/_lib/cache');
const esimgoClient = require('../api/_lib/esimgo/client');

// Импортируем handlers
const countriesHandler = require('../api/esimgo/countries');
const plansHandler = require('../api/esimgo/plans');
const regionPlansHandler = require('../api/esimgo/region-plans');

// Логирование
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

// Создаем mock request и response объекты
function createMockReq(query = {}) {
    return {
        method: 'GET',
        query: query,
        headers: {}
    };
}

function createMockRes() {
    const res = {
        statusCode: 200,
        headers: {},
        data: null,
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            this.data = data;
            return this;
        },
        setHeader: function(key, value) {
            this.headers[key] = value;
        },
        end: function() {
            // Пустая функция для совместимости
        }
    };
    return res;
}

/**
 * Шаг 1: Очистка всего кэша
 */
async function clearAllCache() {
    log('🔄 Шаг 1/2: Очистка кэша...');
    
    try {
        // Очищаем весь кэш
        cache.clear();
        log('✅ Весь кэш очищен');
        return { success: true };
    } catch (error) {
        log(`❌ Ошибка при очистке кэша: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Шаг 2: Перезаполнение кэша
 */
async function refillCache() {
    log('🔄 Шаг 2/2: Перезаполнение кэша...');
    log('⏳ Это может занять несколько минут...');
    
    const results = {
        timestamp: new Date().toISOString(),
        countries: null,
        global: null,
        regions: null,
        local: null
    };
    
    try {
        // 1. Заполняем кэш стран
        try {
            log('📋 Загрузка списка стран...');
            const req = createMockReq();
            const res = createMockRes();
            await countriesHandler(req, res);
            
            if (res.statusCode === 200 && res.data && res.data.success) {
                const count = res.data.data?.length || 0;
                log(`✅ Страны загружены: ${count}`);
                results.countries = { success: true, count };
            } else {
                log(`❌ Ошибка загрузки стран: ${res.data?.error || 'Unknown'}`);
                results.countries = { success: false, error: res.data?.error || 'Unknown' };
            }
        } catch (error) {
            log(`❌ Ошибка при загрузке стран: ${error.message}`);
            results.countries = { success: false, error: error.message };
        }
        
        // 2. Заполняем кэш Global планов
        try {
            log('🌍 Загрузка Global планов...');
            const req = createMockReq({ category: 'global' });
            const res = createMockRes();
            await plansHandler(req, res);
            
            if (res.statusCode === 200 && res.data && res.data.success) {
                const standard = res.data.data?.standard?.length || 0;
                const unlimited = res.data.data?.unlimited?.length || 0;
                log(`✅ Global планы загружены: ${standard} standard, ${unlimited} unlimited`);
                results.global = { success: true, standard, unlimited };
            } else {
                log(`❌ Ошибка загрузки Global планов: ${res.data?.error || 'Unknown'}`);
                results.global = { success: false, error: res.data?.error || 'Unknown' };
            }
        } catch (error) {
            log(`❌ Ошибка при загрузке Global планов: ${error.message}`);
            results.global = { success: false, error: error.message };
        }
        
        // 3. Заполняем кэш Region планов (только основные регионы)
        try {
            log('🗺️  Загрузка Region планов...');
            const regions = ['Europe', 'Asia', 'North America'];
            const regionResults = { success: 0, failed: 0 };
            
            for (const region of regions) {
                try {
                    const req = createMockReq({ region });
                    const res = createMockRes();
                    await regionPlansHandler(req, res);
                    
                    if (res.statusCode === 200 && res.data && res.data.success) {
                        regionResults.success++;
                        log(`  ✅ ${region}: загружено`);
                    } else {
                        regionResults.failed++;
                        log(`  ❌ ${region}: ошибка`);
                    }
                } catch (error) {
                    regionResults.failed++;
                    log(`  ❌ ${region}: ${error.message}`);
                }
            }
            
            log(`✅ Region планы: ${regionResults.success} успешно, ${regionResults.failed} ошибок`);
            results.regions = regionResults;
        } catch (error) {
            log(`❌ Ошибка при загрузке Region планов: ${error.message}`);
            results.regions = { success: 0, failed: 0, error: error.message };
        }
        
        // 4. Local планы загружаются по требованию, не предзаполняем все
        
        return results;
    } catch (error) {
        log(`❌ Критическая ошибка при перезаполнении кэша: ${error.message}`);
        log(`Stack: ${error.stack}`);
        return { ...results, error: error.message };
    }
}

// Главная функция
async function main() {
    log('═══════════════════════════════════════════════════════════');
    log('🔄 Сброс и перезаполнение кэша');
    log('═══════════════════════════════════════════════════════════');
    
    const startTime = Date.now();
    
    try {
        // Шаг 1: Очистка
        const clearResult = await clearAllCache();
        if (!clearResult.success) {
            log('⚠️  Очистка кэша не удалась, но продолжаю...');
        }
        
        // Небольшая задержка
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Шаг 2: Перезаполнение
        const refillResults = await refillCache();
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        log('');
        log('═══════════════════════════════════════════════════════════');
        log('✅ Процесс завершен!');
        log(`⏱️  Время выполнения: ${duration} секунд`);
        log('═══════════════════════════════════════════════════════════');
        log('');
        log('📊 Результаты:');
        log(JSON.stringify({
            countries: refillResults.countries,
            global: refillResults.global,
            regions: refillResults.regions
        }, null, 2));
        
        process.exit(0);
    } catch (error) {
        log('');
        log('═══════════════════════════════════════════════════════════');
        log('❌ Критическая ошибка!');
        log('═══════════════════════════════════════════════════════════');
        log(`Ошибка: ${error.message}`);
        log(`Stack: ${error.stack}`);
        process.exit(1);
    }
}

// Запускаем
main();

