/**
 * Скрипт для проверки цен всех тарифов из esimgo API
 * Используется для верификации корректности цен перед обновлением кэша
 */

require('dotenv').config();
const esimgoClient = require('../api/_lib/esimgo/client');

// Список популярных стран для проверки
const TEST_COUNTRIES = ['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'JP', 'CN', 'AU', 'CA', 'TH', 'SG', 'MY', 'ID', 'PH', 'VN', 'KR', 'IN'];

// Регионы для проверки
const TEST_REGIONS = ['Africa', 'Asia', 'Europe', 'North America', 'Latin America', 'Oceania'];

async function checkCountryPrices(countryCode) {
    try {
        console.log(`\n🔍 Проверка цен для страны: ${countryCode}`);
        
        const catalogue = await esimgoClient.getCatalogue(countryCode, {
            perPage: 1000
        });
        
        const bundles = Array.isArray(catalogue) 
            ? catalogue 
            : (catalogue?.bundles || catalogue?.data || []);
        
        if (bundles.length === 0) {
            console.log(`  ⚠️  Нет тарифов для ${countryCode}`);
            return { country: countryCode, bundles: 0, prices: [] };
        }
        
        // Извлекаем цены из bundles
        const prices = bundles
            .filter(b => {
                // Проверяем наличие цены
                const price = b.price || b.pricePerUnit || b.cost || b.amount;
                return price && price > 0;
            })
            .map(b => {
                let priceValue = b.price || b.pricePerUnit || b.cost || b.amount;
                const currency = b.currency || 'USD';
                
                // Конвертируем центы в доллары если нужно
                if (priceValue > 100 && priceValue < 100000 && priceValue % 1 === 0) {
                    priceValue = priceValue / 100;
                }
                
                return {
                    name: b.name,
                    dataAmount: b.dataAmount,
                    duration: b.duration,
                    unlimited: b.unlimited || false,
                    price: priceValue,
                    currency: currency,
                    priceFormatted: `${currency} ${priceValue.toFixed(2)}`
                };
            })
            .sort((a, b) => a.price - b.price);
        
        console.log(`  ✅ Найдено ${bundles.length} bundles, ${prices.length} с ценами`);
        if (prices.length > 0) {
            console.log(`  💰 Диапазон цен: ${prices[0].priceFormatted} - ${prices[prices.length - 1].priceFormatted}`);
            console.log(`  📊 Примеры цен:`);
            prices.slice(0, 5).forEach(p => {
                console.log(`     - ${p.name}: ${p.priceFormatted} (${p.dataAmount/1000}GB, ${p.duration} дней)`);
            });
        }
        
        return { country: countryCode, bundles: bundles.length, prices: prices };
    } catch (error) {
        console.error(`  ❌ Ошибка для ${countryCode}:`, error.message);
        return { country: countryCode, error: error.message };
    }
}

async function checkGlobalPrices() {
    try {
        console.log(`\n🌍 Проверка Global тарифов...`);
        
        // Получаем каталог без указания страны (Global)
        const catalogue = await esimgoClient.getCatalogue(null, {
            perPage: 1000
        });
        
        const bundles = Array.isArray(catalogue) 
            ? catalogue 
            : (catalogue?.bundles || catalogue?.data || []);
        
        // Фильтруем Global bundles
        const globalBundles = bundles.filter(b => {
            const name = (b.name || '').toLowerCase();
            const desc = (b.description || '').toLowerCase();
            return name.includes('global') || desc.includes('global') || 
                   name.includes('rgb') || name.includes('world');
        });
        
        console.log(`  ✅ Найдено ${globalBundles.length} Global bundles из ${bundles.length} всего`);
        
        const prices = globalBundles
            .filter(b => {
                const price = b.price || b.pricePerUnit || b.cost || b.amount;
                return price && price > 0;
            })
            .map(b => {
                let priceValue = b.price || b.pricePerUnit || b.cost || b.amount;
                const currency = b.currency || 'USD';
                
                if (priceValue > 100 && priceValue < 100000 && priceValue % 1 === 0) {
                    priceValue = priceValue / 100;
                }
                
                return {
                    name: b.name,
                    dataAmount: b.dataAmount,
                    duration: b.duration,
                    unlimited: b.unlimited || false,
                    price: priceValue,
                    currency: currency,
                    priceFormatted: `${currency} ${priceValue.toFixed(2)}`
                };
            })
            .sort((a, b) => a.price - b.price);
        
        if (prices.length > 0) {
            console.log(`  💰 Диапазон цен: ${prices[0].priceFormatted} - ${prices[prices.length - 1].priceFormatted}`);
            console.log(`  📊 Примеры цен:`);
            prices.slice(0, 5).forEach(p => {
                console.log(`     - ${p.name}: ${p.priceFormatted} (${p.dataAmount/1000}GB, ${p.duration} дней)`);
            });
        }
        
        return { type: 'global', bundles: globalBundles.length, prices: prices };
    } catch (error) {
        console.error(`  ❌ Ошибка при проверке Global:`, error.message);
        return { type: 'global', error: error.message };
    }
}

async function main() {
    console.log('🚀 Начало проверки цен тарифов из esimgo API\n');
    
    const results = {
        countries: [],
        global: null,
        summary: {
            totalCountries: 0,
            totalBundles: 0,
            totalPrices: 0,
            errors: 0
        }
    };
    
    // Проверяем Global тарифы
    results.global = await checkGlobalPrices();
    
    // Проверяем цены для каждой страны
    for (const country of TEST_COUNTRIES) {
        const result = await checkCountryPrices(country);
        results.countries.push(result);
        
        if (result.error) {
            results.summary.errors++;
        } else {
            results.summary.totalBundles += result.bundles || 0;
            results.summary.totalPrices += result.prices?.length || 0;
        }
        
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    results.summary.totalCountries = results.countries.length;
    
    // Выводим итоговую статистику
    console.log('\n' + '='.repeat(60));
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
    console.log('='.repeat(60));
    console.log(`Проверено стран: ${results.summary.totalCountries}`);
    console.log(`Всего bundles: ${results.summary.totalBundles}`);
    console.log(`Всего цен: ${results.summary.totalPrices}`);
    console.log(`Ошибок: ${results.summary.errors}`);
    
    if (results.global && !results.global.error) {
        console.log(`Global bundles: ${results.global.bundles}`);
        console.log(`Global цен: ${results.global.prices?.length || 0}`);
    }
    
    console.log('\n✅ Проверка завершена!');
    console.log('\n💡 Следующий шаг: Обновите кэш через /api/cache/prefill');
}

if (require.main === module) {
    main().catch(error => {
        console.error('❌ Критическая ошибка:', error);
        process.exit(1);
    });
}

module.exports = { checkCountryPrices, checkGlobalPrices };

