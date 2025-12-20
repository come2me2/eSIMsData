/**
 * Скрипт для генерации статических JSON файлов из кэша сервера
 * Эти файлы будут отдаваться напрямую через Nginx для моментальной загрузки
 * 
 * Использование:
 *   node scripts/generate-static-data.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Добавляем корневую директорию в путь для require
const rootDir = path.join(__dirname, '..');
process.chdir(rootDir);

const cache = require('../api/_lib/cache');

// Логирование
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

// Создаем директорию для статических данных
const dataDir = path.join(__dirname, '..', 'public', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    log(`📁 Created directory: ${dataDir}`);
}

/**
 * Генерировать статический файл для списка стран
 */
function generateCountriesFile() {
    log('🔄 Generating countries.json...');
    try {
        const cachedCountries = cache.get('countries:all', cache.getTTL('countries'));
        if (cachedCountries && Array.isArray(cachedCountries)) {
            const data = {
                success: true,
                data: cachedCountries,
                meta: {
                    total: cachedCountries.length,
                    generated: new Date().toISOString()
                }
            };
            
            const filePath = path.join(dataDir, 'countries.json');
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            log(`✅ Generated countries.json: ${cachedCountries.length} countries`);
            return { success: true, count: cachedCountries.length };
        } else {
            log('⚠️ Countries cache is empty');
            return { success: false, error: 'Cache is empty' };
        }
    } catch (error) {
        log(`❌ Error generating countries.json: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Генерировать статический файл для Global планов
 */
function generateGlobalPlansFile() {
    log('🔄 Generating plans-global.json...');
    try {
        const cacheKey = cache.getPlansCacheKey(null, null, 'global');
        const cachedData = cache.get(cacheKey, cache.getTTL('plans'));
        
        if (cachedData && cachedData.data) {
            const data = {
                success: true,
                data: cachedData.data,
                meta: {
                    ...cachedData.meta,
                    generated: new Date().toISOString()
                }
            };
            
            const filePath = path.join(dataDir, 'plans-global.json');
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            const standardCount = cachedData.data.standard?.length || 0;
            const unlimitedCount = cachedData.data.unlimited?.length || 0;
            log(`✅ Generated plans-global.json: ${standardCount} standard, ${unlimitedCount} unlimited`);
            return { success: true, standard: standardCount, unlimited: unlimitedCount };
        } else {
            log('⚠️ Global plans cache is empty');
            return { success: false, error: 'Cache is empty' };
        }
    } catch (error) {
        log(`❌ Error generating plans-global.json: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Генерировать статические файлы для Region планов
 */
function generateRegionPlansFiles() {
    log('🔄 Generating region plans files...');
    const regions = ['Africa', 'Asia', 'Europe', 'North America', 'Latin America', 'Oceania', 'Balkanas', 'Central Eurasia'];
    const results = {
        success: 0,
        failed: 0,
        errors: []
    };
    
    for (const region of regions) {
        try {
            const cacheKey = cache.getPlansCacheKey(null, region, 'region');
            const cachedData = cache.get(cacheKey, cache.getTTL('plans'));
            
            if (cachedData && cachedData.data) {
                const data = {
                    success: true,
                    data: cachedData.data,
                    meta: {
                        ...cachedData.meta,
                        generated: new Date().toISOString()
                    }
                };
                
                const fileName = `plans-region-${region.toLowerCase().replace(/\s+/g, '-')}.json`;
                const filePath = path.join(dataDir, fileName);
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
                
                const standardCount = cachedData.data.standard?.length || 0;
                const unlimitedCount = cachedData.data.unlimited?.length || 0;
                log(`✅ Generated ${fileName}: ${standardCount} standard, ${unlimitedCount} unlimited`);
                results.success++;
            } else {
                log(`⚠️ ${region} plans cache is empty`);
                results.failed++;
                results.errors.push({ region, error: 'Cache is empty' });
            }
        } catch (error) {
            log(`❌ Error generating ${region} plans: ${error.message}`);
            results.failed++;
            results.errors.push({ region, error: error.message });
        }
    }
    
    log(`✅ Region plans files generated: ${results.success} success, ${results.failed} failed`);
    return results;
}

/**
 * Генерировать статические файлы для Local планов (для всех стран)
 */
function generateLocalPlansFiles() {
    log('🔄 Generating local plans files for all countries...');
    
    // Получаем список всех стран из кэша
    let allCountries = [];
    try {
        const cachedCountries = cache.get('countries:all', cache.getTTL('countries'));
        if (cachedCountries && Array.isArray(cachedCountries)) {
            allCountries = cachedCountries.map(c => c.code).filter(code => code && code.length >= 2 && code.length <= 5);
            log(`📋 Found ${allCountries.length} countries in cache`);
        } else {
            log('⚠️ Countries cache is empty, cannot generate local plans files');
            return { success: 0, failed: 0, errors: [{ error: 'Countries cache is empty' }] };
        }
    } catch (error) {
        log(`❌ Error loading countries: ${error.message}`);
        return { success: 0, failed: 0, errors: [{ error: error.message }] };
    }
    
    const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: []
    };
    
    // Генерируем файлы для каждой страны
    for (const countryCode of allCountries) {
        try {
            const cacheKey = cache.getPlansCacheKey(countryCode, null, 'local');
            const cachedData = cache.get(cacheKey, cache.getTTL('plans'));
            
            if (cachedData && cachedData.data) {
                const standardCount = cachedData.data.standard?.length || 0;
                const unlimitedCount = cachedData.data.unlimited?.length || 0;
                
                // Пропускаем страны без тарифов
                if (standardCount === 0 && unlimitedCount === 0) {
                    results.skipped++;
                    continue;
                }
                
                const data = {
                    success: true,
                    data: cachedData.data,
                    meta: {
                        ...cachedData.meta,
                        generated: new Date().toISOString()
                    }
                };
                
                const fileName = `plans-local-${countryCode.toLowerCase()}.json`;
                const filePath = path.join(dataDir, fileName);
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
                
                results.success++;
            } else {
                results.skipped++;
            }
        } catch (error) {
            log(`❌ Error generating ${countryCode} plans: ${error.message}`);
            results.failed++;
            results.errors.push({ country: countryCode, error: error.message });
        }
    }
    
    log(`✅ Local plans files generated: ${results.success} success, ${results.skipped} skipped, ${results.failed} failed`);
    return results;
}

// Главная функция
async function main() {
    log('🚀 Starting static data generation from cache...');
    
    const startTime = Date.now();
    const results = {
        timestamp: new Date().toISOString(),
        countries: null,
        global: null,
        regions: null,
        local: null
    };
    
    try {
        // 1. Генерируем файл стран
        results.countries = generateCountriesFile();
        
        // 2. Генерируем файл Global планов
        results.global = generateGlobalPlansFile();
        
        // 3. Генерируем файлы Region планов
        results.regions = generateRegionPlansFiles();
        
        // 4. Генерируем файлы Local планов (для всех стран)
        results.local = generateLocalPlansFiles();
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        log('\n✅ Static data generation completed!');
        log(`⏱️  Total time: ${duration} seconds`);
        log('\n📊 Summary:');
        log(`   Countries: ${results.countries.success ? '✅' : '❌'} ${results.countries.count || 0} countries`);
        log(`   Global: ${results.global.success ? '✅' : '❌'} ${results.global.standard || 0} standard, ${results.global.unlimited || 0} unlimited`);
        log(`   Regions: ${results.regions.success || 0}/${results.regions.success + results.regions.failed || 0} regions`);
        log(`   Local: ${results.local.success || 0} countries (${results.local.skipped || 0} skipped, ${results.local.failed || 0} failed)`);
        
        if (results.regions.errors.length > 0 || results.local.errors.length > 0) {
            log('\n⚠️  Some errors occurred:');
            results.regions.errors.forEach(err => {
                log(`   - ${err.region}: ${err.error}`);
            });
            results.local.errors.slice(0, 10).forEach(err => {
                log(`   - ${err.country}: ${err.error}`);
            });
            if (results.local.errors.length > 10) {
                log(`   ... and ${results.local.errors.length - 10} more errors`);
            }
        }
        
        log(`\n📁 Static files location: ${dataDir}`);
        log('💡 These files will be served directly by Nginx for instant loading!');
        
        process.exit(0);
    } catch (error) {
        log(`\n❌ Static data generation failed: ${error.message}`);
        log(`Stack: ${error.stack}`);
        process.exit(1);
    }
}

// Запускаем
main();
