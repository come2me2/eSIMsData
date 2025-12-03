/**
 * Утилита для загрузки реальных планов из eSIM Go API
 * Используется во всех страницах для получения актуальных цен и тарифов
 */

let cachedPlans = {
    standard: [],
    unlimited: [],
    country: null,
    timestamp: null
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

/**
 * Загрузка планов из API
 * @param {string} countryCode - код страны (ISO, опционально)
 * @param {string} region - название региона (опционально)
 * @returns {Promise<Object>} - объект с standard и unlimited планами
 */
async function loadPlansFromAPI(countryCode = null, region = null) {
    try {
        // Проверяем кеш
        const cacheKey = countryCode || region || 'all';
        const now = Date.now();
        
        if (cachedPlans.country === cacheKey && 
            cachedPlans.timestamp && 
            (now - cachedPlans.timestamp) < CACHE_DURATION) {
            console.log('Using cached plans for:', cacheKey);
            return {
                standard: cachedPlans.standard,
                unlimited: cachedPlans.unlimited
            };
        }
        
        // Загружаем из API
        const params = new URLSearchParams();
        if (countryCode) {
            params.append('country', countryCode);
        }
        if (region) {
            params.append('region', region);
        }
        
        const response = await fetch(`/api/esimgo/plans?${params.toString()}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            // Сохраняем в кеш
            cachedPlans = {
                standard: result.data.standard || [],
                unlimited: result.data.unlimited || [],
                country: cacheKey,
                timestamp: now
            };
            
            // Добавляем ID для совместимости
            cachedPlans.standard.forEach((plan, index) => {
                if (!plan.id) {
                    plan.id = `plan${index + 1}`;
                }
            });
            
            cachedPlans.unlimited.forEach((plan, index) => {
                if (!plan.id) {
                    plan.id = `unlimited${index + 1}`;
                }
            });
            
            console.log('Plans loaded from API:', {
                country: countryCode || region || 'all',
                standard: cachedPlans.standard.length,
                unlimited: cachedPlans.unlimited.length
            });
            
            return {
                standard: cachedPlans.standard,
                unlimited: cachedPlans.unlimited
            };
        } else {
            throw new Error(result.error || 'Failed to load plans');
        }
    } catch (error) {
        console.error('Error loading plans from API:', error);
        
        // Fallback к захардкоженным планам
        return getFallbackPlans();
    }
}

/**
 * Захардкоженные планы (fallback)
 */
function getFallbackPlans() {
    return {
        standard: [
            { data: '1 GB', duration: '7 Days', price: '$ 9.99', id: 'plan1' },
            { data: '2 GB', duration: '7 Days', price: '$ 9.99', id: 'plan2' },
            { data: '3 GB', duration: '30 Days', price: '$ 9.99', id: 'plan3' },
            { data: '5 GB', duration: '30 Days', price: '$ 9.99', id: 'plan4' }
        ],
        unlimited: [
            { data: '∞ GB', duration: '7 Days', price: '$ 9.99', id: 'unlimited1' },
            { data: '∞ GB', duration: '7 Days', price: '$ 9.99', id: 'unlimited2' },
            { data: '∞ GB', duration: '30 Days', price: '$ 9.99', id: 'unlimited3' },
            { data: '∞ GB', duration: '30 Days', price: '$ 9.99', id: 'unlimited4' }
        ]
    };
}

/**
 * Очистка кеша
 */
function clearPlansCache() {
    cachedPlans = {
        standard: [],
        unlimited: [],
        country: null,
        timestamp: null
    };
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadPlansFromAPI, getFallbackPlans, clearPlansCache };
}

