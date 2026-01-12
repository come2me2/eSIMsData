/**
 * Скрипт для обновления предзаполненного кэша тарифов
 * Вызывает endpoint /api/cache/prefill для обновления всех тарифов
 * 
 * Использование:
 *   node scripts/update-tariff-cache.js [API_URL] [SECRET]
 * 
 * Примеры:
 *   node scripts/update-tariff-cache.js
 *   node scripts/update-tariff-cache.js https://your-app.vercel.app your-secret-key
 */

require('dotenv').config();

const API_URL = process.argv[2] || process.env.API_URL || 'http://localhost:3000';
const SECRET = process.argv[3] || process.env.CACHE_REFRESH_SECRET || process.env.CACHE_REFRESH_SECRET || 'esimsdata11';

async function updateCache() {
    console.log('🚀 Начало обновления кэша тарифов...\n');
    console.log(`API URL: ${API_URL}`);
    console.log(`Secret: ${SECRET.substring(0, 4)}...\n`);
    
    try {
        const url = `${API_URL}/api/cache/prefill?secret=${encodeURIComponent(SECRET)}`;
        console.log(`📡 Отправка запроса: ${url.replace(SECRET, '***')}\n`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 РЕЗУЛЬТАТЫ ОБНОВЛЕНИЯ КЭША');
        console.log('='.repeat(60));
        
        if (result.success) {
            console.log('✅ Обновление кэша завершено успешно!\n');
        } else {
            console.log('⚠️  Обновление завершено с ошибками\n');
        }
        
        if (result.duration) {
            console.log(`⏱️  Время выполнения: ${result.duration}\n`);
        }
        
        if (result.results) {
            console.log('📋 Детали:');
            
            if (result.results.countries) {
                const c = result.results.countries;
                console.log(`  🌍 Страны: ${c.success ? `✅ ${c.count || 0} стран` : `❌ ${c.error || 'Ошибка'}`}`);
            }
            
            if (result.results.global) {
                const g = result.results.global;
                if (g.success) {
                    console.log(`  🌐 Global тарифы: ✅ ${g.standard || 0} стандартных, ${g.unlimited || 0} безлимитных`);
                } else {
                    console.log(`  🌐 Global тарифы: ❌ ${g.error || 'Ошибка'}`);
                }
            }
            
            if (result.results.regions) {
                const r = result.results.regions;
                console.log(`  🗺️  Региональные тарифы: ${r.success || 0} успешно, ${r.failed || 0} ошибок`);
                if (r.errors && r.errors.length > 0) {
                    console.log(`     Ошибки: ${r.errors.map(e => `${e.region}: ${e.error}`).join(', ')}`);
                }
            }
            
            if (result.results.local) {
                const l = result.results.local;
                console.log(`  📍 Локальные тарифы: ${l.success || 0} успешно, ${l.skipped || 0} пропущено, ${l.failed || 0} ошибок`);
                if (l.errors && l.errors.length > 0 && l.errors.length <= 10) {
                    console.log(`     Ошибки: ${l.errors.map(e => `${e.country}: ${e.error}`).join(', ')}`);
                } else if (l.errors && l.errors.length > 10) {
                    console.log(`     Ошибки: ${l.errors.length} стран (первые 10: ${l.errors.slice(0, 10).map(e => e.country).join(', ')})`);
                }
            }
        }
        
        console.log('\n' + '='.repeat(60));
        
        if (result.success) {
            console.log('✅ Кэш успешно обновлен! Пользователи теперь увидят актуальные цены.');
        } else {
            console.log('⚠️  Кэш обновлен частично. Проверьте ошибки выше.');
        }
        
        return result;
    } catch (error) {
        console.error('\n❌ Ошибка при обновлении кэша:', error.message);
        if (error.stack) {
            console.error('\nStack trace:', error.stack);
        }
        process.exit(1);
    }
}

if (require.main === module) {
    updateCache();
}

module.exports = { updateCache };
