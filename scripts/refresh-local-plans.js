/**
 * Скрипт для обновления кэша Local планов для конкретных стран
 * Использование: node scripts/refresh-local-plans.js
 */

const path = require('path');

// Добавляем корневую директорию в путь для require
const rootDir = path.join(__dirname, '..');
process.chdir(rootDir);

// Загружаем переменные окружения из .env файла
require('dotenv').config();

// Проверяем наличие необходимых переменных окружения
if (!process.env.ESIMGO_API_KEY) {
    console.warn('⚠️ Предупреждение: ESIMGO_API_KEY не установлен в переменных окружения');
    console.warn('   Убедитесь, что файл .env существует и содержит ESIMGO_API_KEY');
    console.warn('   Продолжаем выполнение, но могут возникнуть ошибки при вызове API...');
    console.warn('');
}

const plansHandler = require('../api/esimgo/plans');

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
        }
    };
    return res;
}

// Логирование
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

/**
 * Обновить кэш для одной страны
 */
async function refreshCountryCache(countryCode, countryName) {
    try {
        log(`🔄 Обновление кэша для ${countryName} (${countryCode})...`);
        
        const req = createMockReq({ 
            country: countryCode, 
            category: 'local' 
        });
        const res = createMockRes();
        
        // Вызываем handler
        await Promise.resolve(plansHandler(req, res)).catch(err => {
            log(`❌ Ошибка handler для ${countryCode}: ${err.message}`);
            throw err;
        });
        
        // Проверяем результат
        if (res.statusCode === 200 && res.data && res.data.success) {
            const standardCount = res.data.data?.standard?.length || 0;
            const unlimitedCount = res.data.data?.unlimited?.length || 0;
            
            if (standardCount > 0 || unlimitedCount > 0) {
                log(`✅ ${countryName} (${countryCode}): ${standardCount} standard, ${unlimitedCount} unlimited`);
                return { 
                    success: true, 
                    countryCode, 
                    countryName,
                    standard: standardCount, 
                    unlimited: unlimitedCount 
                };
            } else {
                log(`⚠️ ${countryName} (${countryCode}): тарифы не найдены`);
                return { 
                    success: false, 
                    countryCode, 
                    countryName,
                    skipped: true,
                    message: 'No plans found' 
                };
            }
        } else {
            const errorMsg = res.data?.error || `HTTP ${res.statusCode}` || 'Unknown error';
            log(`❌ Ошибка для ${countryName} (${countryCode}): ${errorMsg}`);
            return { 
                success: false, 
                countryCode, 
                countryName,
                error: errorMsg 
            };
        }
    } catch (error) {
        log(`❌ Ошибка при обновлении ${countryName} (${countryCode}): ${error.message}`);
        return { 
            success: false, 
            countryCode, 
            countryName,
            error: error.message 
        };
    }
}

/**
 * Главная функция
 */
async function main() {
    log('🚀 Начало обновления кэша Local планов для указанных стран...');
    
    // Страны для обновления
    const countries = [
        { code: 'BO', name: 'Bolivia' },
        { code: 'VG', name: 'British Virgin Islands' },
        { code: 'CW', name: 'Curaçao' },
        { code: 'ET', name: 'Ethiopia' },
        { code: 'GG', name: 'Guernsey' }
    ];
    
    const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: []
    };
    
    // Обновляем каждую страну последовательно
    for (const country of countries) {
        const result = await refreshCountryCache(country.code, country.name);
        
        if (result.success) {
            results.success++;
        } else if (result.skipped) {
            results.skipped++;
        } else {
            results.failed++;
            if (result.error) {
                results.errors.push({ 
                    country: country.name, 
                    code: country.code,
                    error: result.error 
                });
            }
        }
        
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    log('\n✅ Обновление кэша завершено!');
    log(`📊 Результаты:`);
    log(`   ✅ Успешно: ${results.success}`);
    log(`   ⚠️ Пропущено (нет тарифов): ${results.skipped}`);
    log(`   ❌ Ошибки: ${results.failed}`);
    
    if (results.errors.length > 0) {
        log(`\n❌ Ошибки:`);
        results.errors.forEach(err => {
            log(`   - ${err.country} (${err.code}): ${err.error}`);
        });
    }
    
    process.exit(results.failed > 0 ? 1 : 0);
}

// Запускаем скрипт
main().catch(error => {
    log(`\n❌ Критическая ошибка: ${error.message}`);
    if (error.stack) {
        log(`Stack: ${error.stack}`);
    }
    console.error(error);
    process.exit(1);
});

