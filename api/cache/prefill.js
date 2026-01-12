/**
 * Endpoint для предварительного заполнения кэша актуальными данными
 * Используется для первоначальной загрузки данных в кэш
 * 
 * Endpoint: POST /api/cache/prefill
 * 
 * Параметры (query):
 * - secret: секретный ключ для защиты endpoint (из переменной окружения CACHE_REFRESH_SECRET)
 */

// Используем относительные пути, как в других endpoints
const cache = require('../_lib/cache');
const esimgoClient = require('../_lib/esimgo/client');
const { getAPIRegions } = require('../_lib/esimgo/region-mapping');

// Импортируем функции из endpoints
const countriesHandler = require('../esimgo/countries');
const plansHandler = require('../esimgo/plans');
const regionPlansHandler = require('../esimgo/region-plans');

// Секретный ключ для защиты endpoint
const CACHE_REFRESH_SECRET = process.env.CACHE_REFRESH_SECRET || 'change-me-in-production';

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
        },
        statusCode: 200
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
        // ВАЖНО: Используем forceRefresh=true для очистки старого кэша
        // и noMarkup=true для сохранения данных БЕЗ наценки в кэш
        const req = createMockReq({ 
            category: 'global', 
            forceRefresh: 'true',
            noMarkup: 'true'  // Сохраняем в кэш БЕЗ наценки
        });
        const res = createMockRes();
        
        // Вызываем handler с обработкой ошибок
        await Promise.resolve(plansHandler(req, res)).catch(err => {
            log(`❌ Handler error: ${err.message}`);
            throw err;
        });
        
        // Проверяем результат
        if (res.statusCode === 200 && res.data && res.data.success) {
            const standardCount = res.data.data?.standard?.length || 0;
            const unlimitedCount = res.data.data?.unlimited?.length || 0;
            log(`✅ Global plans cache prefilled: ${standardCount} standard, ${unlimitedCount} unlimited`);
            return { success: true, standard: standardCount, unlimited: unlimitedCount };
        } else {
            const errorMsg = res.data?.error || `HTTP ${res.statusCode}` || 'Unknown error';
            log(`❌ Failed to prefill global plans cache: ${errorMsg}`);
            return { success: false, error: errorMsg, statusCode: res.statusCode };
        }
    } catch (error) {
        log(`❌ Error prefilling global plans cache: ${error.message}`);
        log(`Stack: ${error.stack}`);
        return { success: false, error: error.message, stack: error.stack };
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
            // ВАЖНО: Используем forceRefresh=true для очистки старого кэша
            // и noMarkup=true для сохранения данных БЕЗ наценки в кэш
            const req = createMockReq({ 
                region: region,
                forceRefresh: 'true',
                noMarkup: 'true'  // Сохраняем в кэш БЕЗ наценки
            });
            const res = createMockRes();
            
            // Вызываем handler с обработкой ошибок
            await Promise.resolve(regionPlansHandler(req, res)).catch(err => {
                log(`❌ Handler error for ${region}: ${err.message}`);
                throw err;
            });
            
            // Проверяем результат
            if (res.statusCode === 200 && res.data && res.data.success) {
                const standardCount = res.data.data?.standard?.length || 0;
                const unlimitedCount = res.data.data?.unlimited?.length || 0;
                log(`✅ ${region} plans cache prefilled: ${standardCount} standard, ${unlimitedCount} unlimited`);
                results.success++;
            } else {
                const errorMsg = res.data?.error || `HTTP ${res.statusCode}` || 'Unknown error';
                log(`❌ Failed to prefill ${region} plans cache: ${errorMsg}`);
                results.failed++;
                results.errors.push({ region, error: errorMsg, statusCode: res.statusCode });
            }
        } catch (error) {
            log(`❌ Error prefilling ${region} plans cache: ${error.message}`);
            log(`Stack: ${error.stack}`);
            results.failed++;
            results.errors.push({ region, error: error.message, stack: error.stack });
        }
    }
    
    log(`✅ Region plans cache prefilled: ${results.success} success, ${results.failed} failed`);
    return results;
}

/**
 * Предзаполнить кэш для Local планов для всех стран
 * Загружает список стран из кэша и предзаполняет планы для каждой страны параллельно батчами
 */
async function prefillLocalPlansCache() {
    log('🔄 Prefilling local plans cache for all countries...');
    
    // Получаем список всех стран из кэша
    let allCountries = [];
    try {
        const cachedCountries = cache.get('countries:all', cache.getTTL('countries'));
        if (cachedCountries && Array.isArray(cachedCountries)) {
            allCountries = cachedCountries.map(c => c.code).filter(code => code && code.length >= 2 && code.length <= 5);
            log(`📋 Found ${allCountries.length} countries in cache`);
        } else {
            // Если кэш пуст, загружаем страны сначала
            log('⚠️ Countries cache is empty, loading countries first...');
            const req = createMockReq();
            const res = createMockRes();
            await Promise.resolve(countriesHandler(req, res)).catch(err => {
                log(`❌ Error loading countries: ${err.message}`);
            });
            
            if (res.statusCode === 200 && res.data && res.data.success && Array.isArray(res.data.data)) {
                allCountries = res.data.data.map(c => c.code).filter(code => code && code.length >= 2 && code.length <= 5);
                log(`📋 Loaded ${allCountries.length} countries`);
            } else {
                log('⚠️ Could not load countries, using fallback list');
                // Fallback на популярные страны
                allCountries = ['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'JP', 'CN', 'AU', 'CA', 'AD', 'AF', 'AL', 'AR', 'AT', 'BE', 'BR', 'CH', 'CL', 'CO', 'CZ', 'DK', 'EG', 'FI', 'GR', 'HK', 'HU', 'ID', 'IE', 'IL', 'IN', 'IS', 'JO', 'KR', 'KW', 'MY', 'NL', 'NO', 'NZ', 'PH', 'PL', 'PT', 'QA', 'RO', 'SA', 'SE', 'SG', 'TH', 'TR', 'TW', 'UA', 'VN', 'ZA'];
            }
        }
    } catch (error) {
        log(`❌ Error getting countries list: ${error.message}`);
        // Fallback на популярные страны
        allCountries = ['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'JP', 'CN', 'AU', 'CA', 'AD', 'AF', 'AL', 'AR', 'AT', 'BE', 'BR', 'CH', 'CL', 'CO', 'CZ', 'DK', 'EG', 'FI', 'GR', 'HK', 'HU', 'ID', 'IE', 'IL', 'IN', 'IS', 'JO', 'KR', 'KW', 'MY', 'NL', 'NO', 'NZ', 'PH', 'PL', 'PT', 'QA', 'RO', 'SA', 'SE', 'SG', 'TH', 'TR', 'TW', 'UA', 'VN', 'ZA'];
    }
    
    const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: []
    };
    
    // Функция для предзаполнения одной страны
    async function prefillCountry(countryCode) {
        try {
            // ВАЖНО: Используем forceRefresh=true для очистки старого кэша
            // и noMarkup=true для сохранения данных БЕЗ наценки в кэш
            const req = createMockReq({ 
                country: countryCode, 
                category: 'local',
                forceRefresh: 'true',
                noMarkup: 'true'  // Сохраняем в кэш БЕЗ наценки
            });
            const res = createMockRes();
            
            // Вызываем handler с обработкой ошибок
            await Promise.resolve(plansHandler(req, res)).catch(err => {
                log(`❌ Handler error for ${countryCode}: ${err.message}`);
                throw err;
            });
            
            // Проверяем результат
            if (res.statusCode === 200 && res.data && res.data.success) {
                const standardCount = res.data.data?.standard?.length || 0;
                const unlimitedCount = res.data.data?.unlimited?.length || 0;
                if (standardCount > 0 || unlimitedCount > 0) {
                    log(`✅ ${countryCode}: ${standardCount} standard, ${unlimitedCount} unlimited`);
                    return { success: true, countryCode, standard: standardCount, unlimited: unlimitedCount };
                } else {
                    return { success: false, countryCode, skipped: true };
                }
            } else {
                const errorMsg = res.data?.error || `HTTP ${res.statusCode}` || 'Unknown error';
                return { success: false, countryCode, error: errorMsg };
            }
        } catch (error) {
            return { success: false, countryCode, error: error.message };
        }
    }
    
    // Обрабатываем страны параллельно батчами по 10
    const batchSize = 10;
    log(`🔄 Processing ${allCountries.length} countries in batches of ${batchSize}...`);
    
    for (let i = 0; i < allCountries.length; i += batchSize) {
        const batch = allCountries.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(allCountries.length / batchSize);
        
        log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} countries)...`);
        
        // Обрабатываем батч параллельно
        const batchResults = await Promise.all(
            batch.map(countryCode => prefillCountry(countryCode))
        );
        
        // Подсчитываем результаты
        batchResults.forEach(result => {
            if (result.success) {
                results.success++;
            } else if (result.skipped) {
                results.skipped++;
            } else {
                results.failed++;
                if (result.error) {
                    results.errors.push({ country: result.countryCode, error: result.error });
                }
            }
        });
        
        log(`✅ Batch ${batchNum} completed: ${batchResults.filter(r => r.success).length} success, ${batchResults.filter(r => r.skipped).length} skipped, ${batchResults.filter(r => !r.success && !r.skipped).length} failed`);
        
        // Небольшая задержка между батчами, чтобы не перегружать API
        if (i + batchSize < allCountries.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    log(`✅ Local plans cache prefilled: ${results.success} success, ${results.skipped} skipped (no plans), ${results.failed} failed`);
    return results;
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
    const secret = req.query.secret || req.headers['x-cache-refresh-secret'] || req.headers['authorization']?.replace('Bearer ', '');
    
    // Если секрет не установлен или равен дефолтному, пропускаем проверку (для разработки)
    // В продакшене обязательно установите CACHE_REFRESH_SECRET
    if (CACHE_REFRESH_SECRET && CACHE_REFRESH_SECRET !== 'change-me-in-production') {
        if (!secret || secret !== CACHE_REFRESH_SECRET) {
            console.warn('⚠️ Unauthorized cache prefill attempt');
            return res.status(401).json({
                success: false,
                error: 'Unauthorized. Provide correct secret key.'
            });
        }
    }
    
    const startTime = Date.now();
    
    log('🚀 Starting cache prefill process...');
    log('This may take several minutes depending on API response time...');
    
    const results = {
        timestamp: new Date().toISOString(),
        countries: null,
        global: null,
        regions: null,
        local: null
    };
    
    try {
        // Обрабатываем каждый шаг с обработкой ошибок
        try {
            log('Step 1/4: Prefilling countries cache...');
            results.countries = await prefillCountriesCache();
        } catch (error) {
            log(`❌ Error in countries cache: ${error.message}`);
            results.countries = { success: false, error: error.message };
        }
        
        try {
            log('Step 2/4: Prefilling global plans cache...');
            results.global = await prefillGlobalPlansCache();
        } catch (error) {
            log(`❌ Error in global plans cache: ${error.message}`);
            results.global = { success: false, error: error.message };
        }
        
        try {
            log('Step 3/4: Prefilling region plans cache...');
            results.regions = await prefillRegionPlansCache();
        } catch (error) {
            log(`❌ Error in region plans cache: ${error.message}`);
            results.regions = { success: false, error: error.message, success: 0, failed: 0, errors: [] };
        }
        
        try {
            log('Step 4/4: Prefilling local plans cache...');
            results.local = await prefillLocalPlansCache();
        } catch (error) {
            log(`❌ Error in local plans cache: ${error.message}`);
            results.local = { success: false, error: error.message, success: 0, failed: 0, errors: [] };
        }
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        log('\n✅ Cache prefill process completed!');
        log(`⏱️  Total time: ${duration} seconds`);
        
        // Определяем общий успех
        const hasSuccess = 
            (results.countries && results.countries.success) ||
            (results.global && results.global.success) ||
            (results.regions && results.regions.success > 0) ||
            (results.local && results.local.success > 0);
        
        return res.status(hasSuccess ? 200 : 500).json({
            success: hasSuccess,
            message: hasSuccess ? 'Cache prefill completed (some steps may have failed)' : 'Cache prefill failed',
            duration: `${duration} seconds`,
            results: {
                countries: results.countries,
                global: results.global,
                regions: results.regions,
                local: results.local
            }
        });
    } catch (error) {
        log(`\n❌ Cache prefill failed with unexpected error: ${error.message}`);
        log(`Stack: ${error.stack}`);
        return res.status(500).json({
            success: false,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            results: results
        });
    }
};

