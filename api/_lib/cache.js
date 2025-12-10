/**
 * In-memory кэш для API ответов
 * Ускоряет загрузку данных, избегая повторных запросов к eSIM Go API
 */

// Кэш для хранения данных
const cache = new Map();

// TTL (Time To Live) для разных типов данных
// Увеличено до 24 часов, так как данные обновляются по расписанию через cron
const CACHE_TTL = {
    countries: 24 * 60 * 60 * 1000,      // 24 часа - список стран меняется редко
    plans: 24 * 60 * 60 * 1000,          // 24 часа - планы обновляются по расписанию
    regionPlans: 24 * 60 * 60 * 1000,    // 24 часа
    globalPlans: 24 * 60 * 60 * 1000     // 24 часа
};

/**
 * Получить данные из кэша
 * @param {string} key - ключ кэша
 * @param {number} ttl - время жизни в миллисекундах
 * @returns {any|null} - данные из кэша или null
 */
function get(key, ttl) {
    const cached = cache.get(key);
    if (!cached) {
        return null;
    }
    
    const now = Date.now();
    if (now - cached.timestamp > ttl) {
        // Кэш устарел
        cache.delete(key);
        return null;
    }
    
    return cached.data;
}

/**
 * Сохранить данные в кэш
 * @param {string} key - ключ кэша
 * @param {any} data - данные для кэширования
 */
function set(key, data) {
    cache.set(key, {
        data: data,
        timestamp: Date.now()
    });
}

/**
 * Очистить кэш
 * @param {string} key - ключ кэша (опционально, если не указан - очищает весь кэш)
 */
function clear(key) {
    if (key) {
        cache.delete(key);
    } else {
        cache.clear();
    }
}

/**
 * Получить ключ кэша для планов
 * @param {string} countryCode - код страны
 * @param {string} region - регион
 * @param {string} category - категория (global, local)
 * @returns {string} - ключ кэша
 */
function getPlansCacheKey(countryCode, region, category) {
    if (category === 'global') {
        return `plans:global`;
    } else if (category === 'local' && countryCode) {
        return `plans:local:${countryCode}`;
    } else if (region) {
        return `plans:region:${region}`;
    }
    return `plans:all`;
}

/**
 * Получить TTL для типа данных
 * @param {string} type - тип данных (countries, plans, regionPlans, globalPlans)
 * @returns {number} - TTL в миллисекундах
 */
function getTTL(type) {
    return CACHE_TTL[type] || 5 * 60 * 1000; // По умолчанию 5 минут
}

module.exports = {
    get,
    set,
    clear,
    getPlansCacheKey,
    getTTL
};

