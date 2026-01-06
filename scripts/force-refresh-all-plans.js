#!/usr/bin/env node
/**
 * Скрипт для принудительного обновления кэша планов для всех стран
 * Использует forceRefresh=true для каждой страны
 * 
 * Использование:
 *   node scripts/force-refresh-all-plans.js
 */

require('dotenv').config();
const http = require('http');

const API_URL = process.env.DOMAIN || 'http://localhost:3000';

function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

// Получить список всех стран
async function getAllCountries() {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(`${API_URL}/api/esimgo/countries`);
        const req = http.request(urlObj, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.success && Array.isArray(json.data)) {
                        const codes = json.data.map(c => c.code || c.iso).filter(Boolean);
                        resolve(codes);
                    } else {
                        reject(new Error('Failed to get countries'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

// Обновить кэш для страны
async function refreshCountryCache(countryCode) {
    return new Promise((resolve) => {
        const urlObj = new URL(`${API_URL}/api/esimgo/plans?country=${countryCode}&category=local&forceRefresh=true`);
        const req = http.request(urlObj, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ success: json.success, countryCode });
                } catch (e) {
                    resolve({ success: false, countryCode, error: e.message });
                }
            });
        });
        req.on('error', () => {
            resolve({ success: false, countryCode, error: 'Request failed' });
        });
        req.end();
    });
}

async function main() {
    log('🚀 Принудительное обновление кэша планов для всех стран...');
    
    try {
        // Получаем список стран
        log('📋 Получение списка стран...');
        const countries = await getAllCountries();
        log(`✅ Найдено стран: ${countries.length}`);
        
        // Обновляем кэш для каждой страны батчами
        const batchSize = 10;
        let success = 0;
        let failed = 0;
        
        log(`\n🔄 Обновление кэша для ${countries.length} стран (батчами по ${batchSize})...`);
        
        for (let i = 0; i < countries.length; i += batchSize) {
            const batch = countries.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(countries.length / batchSize);
            
            log(`\n📦 Батч ${batchNum}/${totalBatches}: ${batch.join(', ')}`);
            
            const results = await Promise.all(batch.map(code => refreshCountryCache(code)));
            
            results.forEach(result => {
                if (result.success) {
                    success++;
                } else {
                    failed++;
                    log(`  ❌ ${result.countryCode}: ${result.error || 'Failed'}`);
                }
            });
            
            // Небольшая задержка между батчами
            if (i + batchSize < countries.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        log(`\n✅ Обновление завершено!`);
        log(`   Успешно: ${success}`);
        log(`   Ошибок: ${failed}`);
        
    } catch (error) {
        log(`❌ Ошибка: ${error.message}`);
        process.exit(1);
    }
}

main();

