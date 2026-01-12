/**
 * Скрипт для генерации статических JSON файлов из API сервера
 * Эти файлы будут отдаваться напрямую через Nginx для моментальной загрузки
 * 
 * Использование:
 *   node scripts/generate-static-data.js [API_URL]
 *   node scripts/generate-static-data.js http://localhost:3000
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');

// Добавляем корневую директорию в путь для require
const rootDir = path.join(__dirname, '..');
process.chdir(rootDir);

// URL API сервера (по умолчанию localhost:3000)
const API_URL = process.argv[2] || 'http://localhost:3000';

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
 * Выполнить HTTP запрос к API
 */
function fetchAPI(endpoint) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint, API_URL);
        const options = {
            method: 'GET',
            timeout: 30000
        };
        
        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode === 200 && json.success) {
                        resolve(json);
                    } else {
                        reject(new Error(`API error: ${json.error || 'Unknown error'}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse JSON: ${error.message}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

/**
 * Генерировать статический файл для списка стран
 */
async function generateCountriesFile() {
    log('🔄 Generating countries.json...');
    try {
        const response = await fetchAPI('/api/esimgo/countries');
        if (response.data && Array.isArray(response.data)) {
            const data = {
                success: true,
                data: response.data,
                meta: {
                    total: response.data.length,
                    generated: new Date().toISOString()
                }
            };
            
            const filePath = path.join(dataDir, 'countries.json');
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            log(`✅ Generated countries.json: ${response.data.length} countries`);
            return { success: true, count: response.data.length };
        } else {
            log('⚠️ Countries data is empty');
            return { success: false, error: 'Data is empty' };
        }
    } catch (error) {
        log(`❌ Error generating countries.json: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Генерировать статический файл для Global планов
 */
async function generateGlobalPlansFile() {
    log('🔄 Generating plans-global.json...');
    try {
        // ВАЖНО: используем noMarkup=true, чтобы получить себестоимость БЕЗ наценки
        // Наценка будет применяться на клиенте при загрузке данных
        const response = await fetchAPI('/api/esimgo/plans?category=global&noMarkup=true');
        if (response.data) {
            const data = {
                success: true,
                data: response.data,
                meta: {
                    ...response.meta,
                    generated: new Date().toISOString()
                }
            };
            
            const filePath = path.join(dataDir, 'plans-global.json');
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            const standardCount = response.data.standard?.length || 0;
            const unlimitedCount = response.data.unlimited?.length || 0;
            log(`✅ Generated plans-global.json: ${standardCount} standard, ${unlimitedCount} unlimited`);
            return { success: true, standard: standardCount, unlimited: unlimitedCount };
        } else {
            log('⚠️ Global plans data is empty');
            return { success: false, error: 'Data is empty' };
        }
    } catch (error) {
        log(`❌ Error generating plans-global.json: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Генерировать статические файлы для Region планов
 */
async function generateRegionPlansFiles() {
    log('🔄 Generating region plans files...');
    const regions = ['Africa', 'Asia', 'Europe', 'North America', 'Latin America', 'Oceania', 'Balkanas', 'Central Eurasia'];
    const results = {
        success: 0,
        failed: 0,
        errors: []
    };
    
    for (const region of regions) {
        try {
            // ВАЖНО: используем noMarkup=true, чтобы получить себестоимость БЕЗ наценки
            const response = await fetchAPI(`/api/esimgo/region-plans?region=${encodeURIComponent(region)}&noMarkup=true`);
            if (response.data) {
                const data = {
                    success: true,
                    data: response.data,
                    meta: {
                        ...response.meta,
                        generated: new Date().toISOString()
                    }
                };
                
                const fileName = `plans-region-${region.toLowerCase().replace(/\s+/g, '-')}.json`;
                const filePath = path.join(dataDir, fileName);
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
                
                const standardCount = response.data.standard?.length || 0;
                const unlimitedCount = response.data.unlimited?.length || 0;
                log(`✅ Generated ${fileName}: ${standardCount} standard, ${unlimitedCount} unlimited`);
                results.success++;
            } else {
                log(`⚠️ ${region} plans data is empty`);
                results.failed++;
                results.errors.push({ region, error: 'Data is empty' });
            }
        } catch (error) {
            log(`❌ Error generating ${region} plans: ${error.message}`);
            results.failed++;
            results.errors.push({ region, error: error.message });
        }
        
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    log(`✅ Region plans files generated: ${results.success} success, ${results.failed} failed`);
    return results;
}

/**
 * Генерировать статические файлы для Local планов (для всех стран)
 */
async function generateLocalPlansFiles() {
    log('🔄 Generating local plans files for all countries...');
    
    // Получаем список всех стран из API
    let allCountries = [];
    try {
        const response = await fetchAPI('/api/esimgo/countries');
        if (response.data && Array.isArray(response.data)) {
            allCountries = response.data.map(c => c.code).filter(code => code && code.length >= 2 && code.length <= 5);
            log(`📋 Found ${allCountries.length} countries from API`);
        } else {
            log('⚠️ Countries data is empty, cannot generate local plans files');
            return { success: 0, failed: 0, skipped: 0, errors: [{ error: 'Countries data is empty' }] };
        }
    } catch (error) {
        log(`❌ Error loading countries: ${error.message}`);
        return { success: 0, failed: 0, skipped: 0, errors: [{ error: error.message }] };
    }
    
    const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: []
    };
    
    // Генерируем файлы для каждой страны батчами
    const batchSize = 5;
    log(`🔄 Processing ${allCountries.length} countries in batches of ${batchSize}...`);
    
    for (let i = 0; i < allCountries.length; i += batchSize) {
        const batch = allCountries.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(allCountries.length / batchSize);
        
        log(`📦 Batch ${batchNumber}/${totalBatches}: Processing ${batch.join(', ')}...`);
        
        const batchPromises = batch.map(async (countryCode) => {
            try {
                // ВАЖНО: используем noMarkup=true, чтобы получить себестоимость БЕЗ наценки
                const response = await fetchAPI(`/api/esimgo/plans?country=${countryCode}&category=local&noMarkup=true`);
                if (response.data) {
                    const standardCount = response.data.standard?.length || 0;
                    const unlimitedCount = response.data.unlimited?.length || 0;
                    
                    // Пропускаем страны без тарифов
                    if (standardCount === 0 && unlimitedCount === 0) {
                        return { success: false, skipped: true, countryCode };
                    }
                    
                    const data = {
                        success: true,
                        data: response.data,
                        meta: {
                            ...response.meta,
                            generated: new Date().toISOString()
                        }
                    };
                    
                    const fileName = `plans-local-${countryCode.toLowerCase()}.json`;
                    const filePath = path.join(dataDir, fileName);
                    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
                    
                    return { success: true, countryCode, standard: standardCount, unlimited: unlimitedCount };
                } else {
                    return { success: false, skipped: true, countryCode };
                }
            } catch (error) {
                return { success: false, countryCode, error: error.message };
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        
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
        
        // Небольшая задержка между батчами
        if (i + batchSize < allCountries.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    log(`✅ Local plans files generated: ${results.success} success, ${results.skipped} skipped, ${results.failed} failed`);
    return results;
}

// Главная функция
async function main() {
    log(`🚀 Starting static data generation from API: ${API_URL}...`);
    
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
        results.countries = await generateCountriesFile();
        
        // 2. Генерируем файл Global планов
        results.global = await generateGlobalPlansFile();
        
        // 3. Генерируем файлы Region планов
        results.regions = await generateRegionPlansFiles();
        
        // 4. Генерируем файлы Local планов (для всех стран)
        results.local = await generateLocalPlansFiles();
        
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



