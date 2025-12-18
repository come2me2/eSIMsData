/**
 * Генератор статических JSON файлов для моментальной загрузки
 * 
 * Создаёт файлы в public/data/:
 * - countries.json - список всех стран
 * - plans-global.json - глобальные тарифы
 * - plans-region-{region}.json - региональные тарифы
 * - plans-local-{country}.json - локальные тарифы для популярных стран
 * 
 * Запуск: node scripts/generate-static-data.js
 * Cron: 0 3 * * * cd /var/www/esimsdata && node scripts/generate-static-data.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Импортируем API handlers
const countriesHandler = require('../api/esimgo/countries');
const plansHandler = require('../api/esimgo/plans');
const regionPlansHandler = require('../api/esimgo/region-plans');

const DATA_DIR = path.join(__dirname, '../public/data');

// Регионы для генерации
const REGIONS = ['Africa', 'Asia', 'Europe', 'North America', 'Latin America', 'Oceania', 'Balkanas', 'Central Eurasia'];

// ВСЕ страны для предзагрузки Local планов (для мгновенной загрузки)
const POPULAR_COUNTRIES = [
    // Европа
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT',
    'NL', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH',
    'GB', 'AL', 'BA', 'ME', 'MK', 'RS', 'XK', 'AD', 'MC', 'SM',
    'LI', 'AX', 'FO', 'GI', 'IM', 'JE', 'GG',
    // Азия
    'CN', 'JP', 'KR', 'TW', 'HK', 'MO', 'SG', 'MY', 'TH', 'VN',
    'ID', 'PH', 'IN', 'PK', 'BD', 'LK', 'NP', 'KH', 'LA', 'MM',
    'MN', 'KZ', 'UZ', 'KG', 'TJ', 'AZ', 'GE', 'AM',
    // Ближний Восток
    'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'JO', 'IL', 'TR', 'EG',
    // Америка
    'US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'EC', 'VE',
    'PA', 'CR', 'GT', 'DO', 'PR', 'JM', 'TT', 'BB', 'BS',
    // Океания
    'AU', 'NZ', 'FJ', 'PG',
    // Африка
    'ZA', 'EG', 'MA', 'TN', 'KE', 'NG', 'GH', 'TZ', 'UG', 'ET',
    // СНГ
    'RU', 'UA', 'BY', 'MD'
];

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

function createMockReq(query = {}) {
    return { method: 'GET', query, headers: {} };
}

function createMockRes() {
    return {
        statusCode: 200,
        headers: {},
        data: null,
        status(code) { this.statusCode = code; return this; },
        json(data) { this.data = data; return this; },
        setHeader(key, value) { this.headers[key] = value; },
        end() {}
    };
}

async function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        log(`📁 Created directory: ${DATA_DIR}`);
    }
}

function writeDataFile(filename, data) {
    const filepath = path.join(DATA_DIR, filename);
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(filepath, content, 'utf8');
    log(`✅ Written: ${filename} (${(content.length / 1024).toFixed(1)} KB)`);
}

async function generateCountries() {
    log('🔄 Generating countries.json...');
    try {
        const req = createMockReq();
        const res = createMockRes();
        await countriesHandler(req, res);
        
        if (res.statusCode === 200 && res.data?.success) {
            const data = {
                success: true,
                data: res.data.data,
                meta: { ...res.data.meta, generated: new Date().toISOString() }
            };
            writeDataFile('countries.json', data);
            return res.data.data?.length || 0;
        }
        throw new Error(res.data?.error || 'Unknown error');
    } catch (error) {
        log(`❌ Error generating countries: ${error.message}`);
        return 0;
    }
}

async function generateGlobalPlans() {
    log('🔄 Generating plans-global.json...');
    try {
        const req = createMockReq({ category: 'global' });
        const res = createMockRes();
        await plansHandler(req, res);
        
        if (res.statusCode === 200 && res.data?.success) {
            const data = {
                success: true,
                data: res.data.data,
                meta: { ...res.data.meta, generated: new Date().toISOString() }
            };
            writeDataFile('plans-global.json', data);
            return {
                standard: res.data.data?.standard?.length || 0,
                unlimited: res.data.data?.unlimited?.length || 0
            };
        }
        throw new Error(res.data?.error || 'Unknown error');
    } catch (error) {
        log(`❌ Error generating global plans: ${error.message}`);
        return { standard: 0, unlimited: 0 };
    }
}

async function generateRegionPlans() {
    log('🔄 Generating region plans...');
    const results = { success: 0, failed: 0 };
    
    for (const region of REGIONS) {
        try {
            const req = createMockReq({ region });
            const res = createMockRes();
            await regionPlansHandler(req, res);
            
            if (res.statusCode === 200 && res.data?.success) {
                const filename = `plans-region-${region.toLowerCase().replace(/\s+/g, '-')}.json`;
                const data = {
                    success: true,
                    data: res.data.data,
                    meta: { ...res.data.meta, region, generated: new Date().toISOString() }
                };
                writeDataFile(filename, data);
                results.success++;
            } else {
                log(`⚠️ No data for region: ${region}`);
                results.failed++;
            }
        } catch (error) {
            log(`❌ Error generating ${region}: ${error.message}`);
            results.failed++;
        }
    }
    return results;
}

async function generateLocalPlans() {
    log('🔄 Generating local plans for popular countries...');
    const results = { success: 0, failed: 0, skipped: 0 };
    
    for (const country of POPULAR_COUNTRIES) {
        try {
            const req = createMockReq({ country, category: 'local' });
            const res = createMockRes();
            await plansHandler(req, res);
            
            if (res.statusCode === 200 && res.data?.success) {
                const standard = res.data.data?.standard?.length || 0;
                const unlimited = res.data.data?.unlimited?.length || 0;
                
                if (standard > 0 || unlimited > 0) {
                    const filename = `plans-local-${country.toLowerCase()}.json`;
                    const data = {
                        success: true,
                        data: res.data.data,
                        meta: { ...res.data.meta, country, generated: new Date().toISOString() }
                    };
                    writeDataFile(filename, data);
                    results.success++;
                } else {
                    results.skipped++;
                }
            } else {
                results.failed++;
            }
        } catch (error) {
            log(`❌ Error generating ${country}: ${error.message}`);
            results.failed++;
        }
        
        // Небольшая пауза между запросами, чтобы не перегружать API
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return results;
}

async function generateIndex() {
    log('🔄 Generating data index...');
    
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && f !== 'index.json');
    const index = {
        generated: new Date().toISOString(),
        files: files.map(f => ({
            name: f,
            size: fs.statSync(path.join(DATA_DIR, f)).size,
            url: `/data/${f}`
        })),
        endpoints: {
            countries: '/data/countries.json',
            global: '/data/plans-global.json',
            regions: REGIONS.map(r => ({
                name: r,
                url: `/data/plans-region-${r.toLowerCase().replace(/\s+/g, '-')}.json`
            })),
            local: POPULAR_COUNTRIES.filter(c => 
                fs.existsSync(path.join(DATA_DIR, `plans-local-${c.toLowerCase()}.json`))
            ).map(c => ({
                country: c,
                url: `/data/plans-local-${c.toLowerCase()}.json`
            }))
        }
    };
    
    writeDataFile('index.json', index);
}

async function main() {
    const startTime = Date.now();
    log('🚀 Starting static data generation...');
    log(`📁 Output directory: ${DATA_DIR}`);
    
    await ensureDataDir();
    
    // Генерируем все данные
    const countriesCount = await generateCountries();
    const globalPlans = await generateGlobalPlans();
    const regionResults = await generateRegionPlans();
    const localResults = await generateLocalPlans();
    
    // Генерируем индекс
    await generateIndex();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    log('\n✅ Static data generation completed!');
    log(`⏱️  Duration: ${duration}s`);
    log('\n📊 Summary:');
    log(`   Countries: ${countriesCount}`);
    log(`   Global plans: ${globalPlans.standard} standard, ${globalPlans.unlimited} unlimited`);
    log(`   Regions: ${regionResults.success}/${REGIONS.length}`);
    log(`   Local: ${localResults.success} countries (${localResults.skipped} skipped, ${localResults.failed} failed)`);
    log('\n🎉 Data is now available at /data/*.json');
}

main().catch(error => {
    log(`❌ Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
});

