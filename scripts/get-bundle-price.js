#!/usr/bin/env node
/**
 * Скрипт для получения цены тарифа из API eSIMgo по bundle_name
 * 
 * Использование:
 *   node scripts/get-bundle-price.js <bundle_name>
 * 
 * Пример:
 *   node scripts/get-bundle-price.js esim_1GB_7D_AT_V2
 */

require('dotenv').config();
const esimgoClient = require('../api/_lib/esimgo/client');

async function getBundlePrice(bundleName) {
    try {
        console.log(`🔍 Поиск тарифа: ${bundleName}`);
        
        // Извлекаем код страны из bundle_name (AT из esim_1GB_7D_AT_V2)
        const match = bundleName.match(/esim_\d+GB_\d+D_([A-Z]{2,})_V\d+/);
        if (!match) {
            console.error('❌ Не удалось извлечь код страны из bundle_name');
            return;
        }
        
        const countryCode = match[1];
        console.log(`📍 Код страны: ${countryCode}`);
        
        // Получаем каталог для страны
        console.log(`📥 Загрузка каталога для ${countryCode}...`);
        const catalogue = await esimgoClient.getCatalogue(countryCode, {
            perPage: 1000
        });
        
        // Извлекаем bundles из ответа
        const bundles = Array.isArray(catalogue) 
            ? catalogue 
            : (catalogue.bundles || catalogue.data || []);
        
        console.log(`📦 Найдено bundles: ${bundles.length}`);
        
        // Ищем bundle по имени
        const bundle = bundles.find(b => b.name === bundleName);
        
        if (!bundle) {
            console.error(`❌ Bundle "${bundleName}" не найден в каталоге`);
            console.log(`\nДоступные bundles для ${countryCode}:`);
            bundles.slice(0, 10).forEach(b => {
                console.log(`  - ${b.name}`);
            });
            if (bundles.length > 10) {
                console.log(`  ... и еще ${bundles.length - 10} bundles`);
            }
            return;
        }
        
        console.log(`\n✅ Найден bundle:`);
        console.log(`   Имя: ${bundle.name}`);
        console.log(`   Данные: ${bundle.dataAmount} MB`);
        console.log(`   Длительность: ${bundle.duration} дней`);
        console.log(`   Unlimited: ${bundle.unlimited || false}`);
        
        // Извлекаем цену
        const priceFields = [
            { name: 'price', value: bundle.price },
            { name: 'pricePerUnit', value: bundle.pricePerUnit },
            { name: 'cost', value: bundle.cost },
            { name: 'amount', value: bundle.amount },
            { name: 'fee', value: bundle.fee },
            { name: 'totalPrice', value: bundle.totalPrice },
            { name: 'userPrice', value: bundle.userPrice },
            { name: 'basePrice', value: bundle.basePrice }
        ];
        
        console.log(`\n💰 Цены из API eSIMgo:`);
        let foundPrice = null;
        let foundCurrency = 'USD';
        
        for (const field of priceFields) {
            if (field.value !== undefined && field.value !== null) {
                if (typeof field.value === 'number' && field.value > 0) {
                    foundPrice = field.value;
                    console.log(`   ${field.name}: $${foundPrice.toFixed(2)}`);
                } else if (typeof field.value === 'object' && field.value.amount) {
                    const amount = typeof field.value.amount === 'number' 
                        ? field.value.amount 
                        : parseFloat(field.value.amount) || 0;
                    if (amount > 0) {
                        foundPrice = amount;
                        foundCurrency = field.value.currency || 'USD';
                        console.log(`   ${field.name}: ${foundCurrency} ${foundPrice.toFixed(2)}`);
                    }
                } else if (typeof field.value === 'string') {
                    const parsed = parseFloat(field.value);
                    if (!isNaN(parsed) && parsed > 0) {
                        foundPrice = parsed;
                        console.log(`   ${field.name}: $${foundPrice.toFixed(2)}`);
                    }
                }
            }
        }
        
        // Если цена в центах (больше 100 и меньше 100000), конвертируем в доллары
        if (foundPrice && foundPrice > 100 && foundPrice < 100000 && foundPrice % 1 === 0) {
            foundPrice = foundPrice / 100;
            console.log(`\n   ⚠️  Цена была в центах, конвертирована в доллары: $${foundPrice.toFixed(2)}`);
        }
        
        if (!foundPrice) {
            console.log(`\n   ❌ Цена не найдена в bundle`);
            console.log(`\n   Все поля bundle:`);
            console.log(JSON.stringify(bundle, null, 2));
        } else {
            console.log(`\n✅ Итоговая цена (себестоимость): $${foundPrice.toFixed(2)} ${foundCurrency}`);
        }
        
        // Теперь проверим, какая цена показывается в приложении
        console.log(`\n📱 Проверка цены в приложении...`);
        const http = require('http');
        const url = require('url');
        
        const appUrl = process.env.DOMAIN || 'http://localhost:3000';
        const plansUrl = `${appUrl}/api/esimgo/plans?country=${countryCode}&category=local`;
        
        console.log(`   Запрос: ${plansUrl}`);
        
        const response = await new Promise((resolve, reject) => {
            const urlObj = new URL(plansUrl);
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || 3000,
                path: urlObj.pathname + urlObj.search,
                method: 'GET'
            };
            
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            
            req.on('error', reject);
            req.end();
        });
        
        if (response.success && response.data) {
            const plans = [...(response.data.standard || []), ...(response.data.unlimited || [])];
            const appPlan = plans.find(p => p.bundle_name === bundleName || p.id === bundleName);
            
            if (appPlan) {
                console.log(`\n✅ Найден план в приложении:`);
                console.log(`   Имя: ${appPlan.data || appPlan.id}`);
                console.log(`   Длительность: ${appPlan.duration}`);
                console.log(`   Цена в приложении: ${appPlan.price || 'не указана'}`);
                console.log(`   priceValue: ${appPlan.priceValue || 'не указано'}`);
                console.log(`   bundle_name: ${appPlan.bundle_name || 'не указано'}`);
                
                if (appPlan.priceValue && foundPrice) {
                    const diff = Math.abs(appPlan.priceValue - foundPrice);
                    if (diff < 0.01) {
                        console.log(`\n✅ Цены совпадают!`);
                    } else {
                        console.log(`\n⚠️  Цены НЕ совпадают:`);
                        console.log(`   API eSIMgo: $${foundPrice.toFixed(2)}`);
                        console.log(`   В приложении: $${appPlan.priceValue.toFixed(2)}`);
                        console.log(`   Разница: $${diff.toFixed(2)}`);
                    }
                }
            } else {
                console.log(`\n⚠️  План с bundle_name "${bundleName}" не найден в ответе приложения`);
                console.log(`   Найдено планов: ${plans.length}`);
                if (plans.length > 0) {
                    console.log(`   Примеры планов:`);
                    plans.slice(0, 3).forEach(p => {
                        console.log(`     - ${p.bundle_name || p.id}: ${p.price} (priceValue: ${p.priceValue})`);
                    });
                }
            }
        } else {
            console.log(`\n⚠️  Не удалось получить планы из приложения`);
        }
        
    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        console.error(error.stack);
    }
}

// Запуск
const bundleName = process.argv[2];
if (!bundleName) {
    console.error('❌ Укажите bundle_name');
    console.log('Использование: node scripts/get-bundle-price.js <bundle_name>');
    console.log('Пример: node scripts/get-bundle-price.js esim_1GB_7D_AT_V2');
    process.exit(1);
}

getBundlePrice(bundleName).then(() => {
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});

