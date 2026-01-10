#!/usr/bin/env node

/**
 * Скрипт для обновления и перезаполнения кэша тарифов
 * 
 * Использование:
 * node scripts/refresh-cache.js
 * 
 * Или на сервере:
 * cd /var/www/esimsdata && node scripts/refresh-cache.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CACHE_REFRESH_SECRET = process.env.CACHE_REFRESH_SECRET || 'change-me-in-production';

async function refreshCache() {
    console.log('\n🔄 Starting cache refresh process...\n');
    
    try {
        // Шаг 1: Очищаем кэш
        console.log('Step 1/2: Clearing cache...');
        const refreshUrl = `${BASE_URL}/api/cache/refresh?secret=${CACHE_REFRESH_SECRET}&type=all`;
        
        const refreshResponse = await fetch(refreshUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!refreshResponse.ok) {
            throw new Error(`Refresh failed: ${refreshResponse.status} ${refreshResponse.statusText}`);
        }
        
        const refreshData = await refreshResponse.json();
        console.log('✅ Cache cleared:', refreshData);
        
        // Небольшая задержка перед заполнением
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Шаг 2: Перезаполняем кэш
        console.log('\nStep 2/2: Prefilling cache with fresh data...');
        console.log('⚠️  This may take several minutes...\n');
        
        const prefillUrl = `${BASE_URL}/api/cache/prefill?secret=${CACHE_REFRESH_SECRET}`;
        
        const prefillResponse = await fetch(prefillUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!prefillResponse.ok) {
            throw new Error(`Prefill failed: ${prefillResponse.status} ${prefillResponse.statusText}`);
        }
        
        const prefillData = await prefillResponse.json();
        
        console.log('\n✅ Cache prefill completed!');
        console.log('Results:', JSON.stringify(prefillData, null, 2));
        
        if (prefillData.success) {
            console.log('\n✅ Cache successfully refreshed and prefilled!');
            return true;
        } else {
            console.log('\n⚠️  Cache prefill completed with some errors');
            return false;
        }
        
    } catch (error) {
        console.error('\n❌ Error refreshing cache:', error.message);
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
        return false;
    }
}

// Запускаем скрипт
if (require.main === module) {
    refreshCache()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { refreshCache };

