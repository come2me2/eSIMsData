/**
 * Скрипт для предварительного заполнения кэша актуальными данными
 * Запускается вручную для первоначальной загрузки данных в кэш
 * 
 * Использование:
 *   node scripts/prefill-cache.js
 */

require('dotenv').config();
const cache = require('../api/_lib/cache');
const esimgoClient = require('../api/_lib/esimgo/client');
const { getAPIRegions } = require('../api/_lib/esimgo/region-mapping');

// Импортируем функции из endpoints
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
        end: function() {}
    };
    return res;
}

/**
 * Предзаполнить кэш для списка стран
 */
async function prefillCountriesCache() {
    log('🔄 Prefilling countries cache...');
    try {
        const req = createMockReq();
        const res = createMockRes();
        
        await countriesHandler(req, res);
        
        if (res.statusCode === 200 && res.data && res.data.success) {
            log(`✅ Countries cache prefilled: ${res.data.data?.length || 0} countries`);
            return { success: true, count: res.data.data?.length || 0 };
        } else {
            log(`❌ Failed to prefill countries cache: ${JSON.stringify(res.data)}`);
            return { success: false, error: res.data?.error || 'Unknown error' };
        }
    } catch (error) {
        log(`❌ Error prefilling countries cache: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Предзаполнить кэш для Global планов
 */
async function prefillGlobalPlansCache() {
    log('🔄 Prefilling global plans cache...');
    try {
        const req = createMockReq({ category: 'global' });
        const res = createMockRes();
        
        await plansHandler(req, res);
        
        if (res.statusCode === 200 && res.data && res.data.success) {
            const standardCount = res.data.data?.standard?.length || 0;
            const unlimitedCount = res.data.data?.unlimited?.length || 0;
            log(`✅ Global plans cache prefilled: ${standardCount} standard, ${unlimitedCount} unlimited`);
            return { success: true, standard: standardCount, unlimited: unlimitedCount };
        } else {
            log(`❌ Failed to prefill global plans cache: ${JSON.stringify(res.data)}`);
            return { success: false, error: res.data?.error || 'Unknown error' };
        }
    } catch (error) {
        log(`❌ Error prefilling global plans cache: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Предзаполнить кэш для Region планов
 */
async function prefillRegionPlansCache() {
    log('🔄 Prefilling region plans cache...');
    const regions = ['Africa', 'Asia', 'Europe', 'North America', 'Latin America', 'Oceania', 'Balkanas', 'Central Eurasia'];
    const results = {
        success: 0,
        failed: 0,
        errors: []
    };
    
    for (const region of regions) {
        try {
            log(`🔄 Prefilling ${region} plans cache...`);
            const req = createMockReq({ region: region });
            const res = createMockRes();
            
            await regionPlansHandler(req, res);
            
            if (res.statusCode === 200 && res.data && res.data.success) {
                const standardCount = res.data.data?.standard?.length || 0;
                const unlimitedCount = res.data.data?.unlimited?.length || 0;
                log(`✅ ${region} plans cache prefilled: ${standardCount} standard, ${unlimitedCount} unlimited`);
                results.success++;
            } else {
                log(`❌ Failed to prefill ${region} plans cache: ${JSON.stringify(res.data)}`);
                results.failed++;
                results.errors.push({ region, error: res.data?.error || 'Unknown error' });
            }
        } catch (error) {
            log(`❌ Error prefilling ${region} plans cache: ${error.message}`);
            results.failed++;
            results.errors.push({ region, error: error.message });
        }
    }
    
    log(`✅ Region plans cache prefilled: ${results.success} success, ${results.failed} failed`);
    return results;
}

/**
 * Предзаполнить кэш для Local планов (опционально, для популярных стран)
 */
async function prefillLocalPlansCache() {
    log('🔄 Prefilling local plans cache for popular countries...');
    // Популярные страны для предзаполнения
    const popularCountries = ['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'JP', 'CN', 'AU', 'CA'];
    const results = {
        success: 0,
        failed: 0,
        errors: []
    };
    
    for (const countryCode of popularCountries) {
        try {
            log(`🔄 Prefilling ${countryCode} local plans cache...`);
            const req = createMockReq({ country: countryCode, category: 'local' });
            const res = createMockRes();
            
            await plansHandler(req, res);
            
            if (res.statusCode === 200 && res.data && res.data.success) {
                const standardCount = res.data.data?.standard?.length || 0;
                const unlimitedCount = res.data.data?.unlimited?.length || 0;
                if (standardCount > 0 || unlimitedCount > 0) {
                    log(`✅ ${countryCode} local plans cache prefilled: ${standardCount} standard, ${unlimitedCount} unlimited`);
                    results.success++;
                } else {
                    log(`⚠️ ${countryCode} has no plans, skipping`);
                }
            } else {
                log(`❌ Failed to prefill ${countryCode} local plans cache`);
                results.failed++;
                results.errors.push({ country: countryCode, error: res.data?.error || 'Unknown error' });
            }
        } catch (error) {
            log(`❌ Error prefilling ${countryCode} local plans cache: ${error.message}`);
            results.failed++;
            results.errors.push({ country: countryCode, error: error.message });
        }
    }
    
    log(`✅ Local plans cache prefilled: ${results.success} success, ${results.failed} failed`);
    return results;
}

// Главная функция
async function main() {
    log('🚀 Starting cache prefill process...');
    log('This may take several minutes depending on API response time...');
    
    const startTime = Date.now();
    const results = {
        timestamp: new Date().toISOString(),
        countries: null,
        global: null,
        regions: null,
        local: null
    };
    
    try {
        // 1. Предзаполняем кэш стран
        results.countries = await prefillCountriesCache();
        
        // 2. Предзаполняем кэш Global планов
        results.global = await prefillGlobalPlansCache();
        
        // 3. Предзаполняем кэш Region планов
        results.regions = await prefillRegionPlansCache();
        
        // 4. Предзаполняем кэш Local планов (опционально)
        results.local = await prefillLocalPlansCache();
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        log('\n✅ Cache prefill completed successfully!');
        log(`⏱️  Total time: ${duration} seconds`);
        log('\n📊 Summary:');
        log(`   Countries: ${results.countries.success ? '✅' : '❌'} ${results.countries.count || 0} countries`);
        log(`   Global: ${results.global.success ? '✅' : '❌'} ${results.global.standard || 0} standard, ${results.global.unlimited || 0} unlimited`);
        log(`   Regions: ${results.regions.success || 0}/${results.regions.success + results.regions.failed || 0} regions`);
        log(`   Local: ${results.local.success || 0}/${results.local.success + results.local.failed || 0} countries`);
        
        if (results.regions.errors.length > 0 || results.local.errors.length > 0) {
            log('\n⚠️  Some errors occurred:');
            results.regions.errors.forEach(err => {
                log(`   - ${err.region}: ${err.error}`);
            });
            results.local.errors.forEach(err => {
                log(`   - ${err.country}: ${err.error}`);
            });
        }
        
        log('\n🎉 Cache is now prefilled! Users will see cached data immediately.');
        log('💡 Remember to set up cron job for automatic daily updates (see CONTABO_CRON_SETUP.md)');
        
        process.exit(0);
    } catch (error) {
        log(`\n❌ Cache prefill failed: ${error.message}`);
        log(`Stack: ${error.stack}`);
        process.exit(1);
    }
}

// Запускаем
main();

