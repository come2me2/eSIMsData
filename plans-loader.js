/**
 * Утилита для загрузки реальных планов из eSIM Go API
 * Использует оптимизированный DataLoader с многоуровневым кэшированием
 * Приоритет: memory cache -> localStorage -> static JSON -> API
 */

let cachedPlans = {
    standard: [],
    unlimited: [],
    country: null,
    timestamp: null
};

const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 часа (данные обновляются ночью)

/**
 * Загрузка планов с оптимизацией
 * @param {string} countryCode - код страны (ISO, опционально)
 * @param {string} region - название региона (опционально)
 * @param {string} category - категория: 'local', 'region', 'global'
 * @returns {Promise<Object>} - объект с standard и unlimited планами
 */
async function loadPlansFromAPI(countryCode = null, region = null, category = null) {
    try {
        const cacheKey = countryCode || region || category || 'all';
        const now = Date.now();
        const startTime = performance.now();
        
        // Проверяем memory cache (мгновенно)
        if (cachedPlans.country === cacheKey && 
            cachedPlans.timestamp && 
            (now - cachedPlans.timestamp) < CACHE_DURATION) {
            console.log(`⚡ Memory cache hit: ${cacheKey}`);
            return {
                standard: cachedPlans.standard,
                unlimited: cachedPlans.unlimited
            };
        }
        
        let data = null;
        
        // Используем DataLoader если доступен
        if (window.DataLoader) {
            try {
                if (category === 'global') {
                    data = await window.DataLoader.loadGlobalPlans();
                } else if (region) {
                    data = await window.DataLoader.loadRegionPlans(region);
                } else if (countryCode) {
                    data = await window.DataLoader.loadLocalPlans(countryCode);
                }
            } catch (e) {
                console.warn('⚠️ DataLoader failed:', e.message);
            }
        }
        
        // Fallback: прямой запрос к API
        if (!data) {
            const params = new URLSearchParams();
            if (countryCode) params.append('country', countryCode);
            if (region) params.append('region', region);
            if (category) params.append('category', category);
            
            const response = await fetch(`/api/esimgo/plans?${params.toString()}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                data = result.data;
            } else {
                throw new Error(result.error || 'Failed to load plans');
            }
        }
        
        if (data) {
            // Сохраняем в memory cache
            cachedPlans = {
                standard: data.standard || [],
                unlimited: data.unlimited || [],
                country: cacheKey,
                timestamp: now
            };
            
            // Добавляем ID для совместимости
            cachedPlans.standard.forEach((plan, index) => {
                if (!plan.id) plan.id = `plan${index + 1}`;
            });
            
            cachedPlans.unlimited.forEach((plan, index) => {
                if (!plan.id) plan.id = `unlimited${index + 1}`;
            });
            
            console.log(`✅ Plans loaded in ${(performance.now() - startTime).toFixed(0)}ms:`, {
                key: cacheKey,
                standard: cachedPlans.standard.length,
                unlimited: cachedPlans.unlimited.length
            });
            
            return {
                standard: cachedPlans.standard,
                unlimited: cachedPlans.unlimited
            };
        }
        
        throw new Error('No data received');
    } catch (error) {
        console.error('❌ Error loading plans:', error);
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

