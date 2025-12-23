/**
 * Оптимизированный загрузчик данных с кэшированием
 * Загружает данные из статических JSON файлов (моментально)
 * с fallback на API endpoints
 */

(function() {
    'use strict';
    
    const CACHE_PREFIX = 'esim_cache_';
    // Bump this to force-reset localStorage cache for all users
    const CACHE_VERSION = 'v4';
    const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 часа (данные обновляются ночью)
    
    /**
     * Кэш в localStorage
     */
    const localCache = {
        get(key) {
            try {
                const item = localStorage.getItem(CACHE_PREFIX + key);
                if (!item) return null;
                
                const parsed = JSON.parse(item);
                if (parsed.version !== CACHE_VERSION) {
                    this.remove(key);
                    return null;
                }
                
                if (Date.now() - parsed.timestamp > CACHE_TTL) {
                    // Данные устарели, но возвращаем их пока загружаются свежие
                    parsed.stale = true;
                }
                
                return parsed;
            } catch (e) {
                console.warn('Cache read error:', e);
                return null;
            }
        },
        
        set(key, data) {
            try {
                const item = {
                    version: CACHE_VERSION,
                    timestamp: Date.now(),
                    data: data
                };
                localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
            } catch (e) {
                // localStorage может быть заполнен
                console.warn('Cache write error:', e);
                this.cleanup();
            }
        },
        
        remove(key) {
            localStorage.removeItem(CACHE_PREFIX + key);
        },
        
        cleanup() {
            // Удаляем устаревшие записи
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(CACHE_PREFIX)) {
                    try {
                        const item = JSON.parse(localStorage.getItem(key));
                        if (item.version !== CACHE_VERSION || Date.now() - item.timestamp > CACHE_TTL * 2) {
                            keysToRemove.push(key);
                        }
                    } catch (e) {
                        keysToRemove.push(key);
                    }
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        }
    };
    
    /**
     * In-memory кэш для текущей сессии
     */
    const memoryCache = new Map();
    
    /**
     * Загрузка данных с приоритетом:
     * 1. Memory cache (мгновенно)
     * 2. localStorage cache (мгновенно)
     * 3. Static JSON file (/data/*.json) - быстро, nginx отдаёт напрямую
     * 4. API endpoint (медленно, но всегда актуально)
     */
    async function loadData(cacheKey, staticPath, apiPath, options = {}) {
        const { forceRefresh = false, timeout = 10000 } = options;
        
        // 1. Проверяем memory cache
        if (!forceRefresh && memoryCache.has(cacheKey)) {
            console.log(`⚡ Memory cache hit: ${cacheKey}`);
            return memoryCache.get(cacheKey);
        }
        
        // 2. Проверяем localStorage cache
        if (!forceRefresh) {
            const cached = localCache.get(cacheKey);
            if (cached && cached.data) {
                console.log(`💾 LocalStorage cache hit: ${cacheKey}${cached.stale ? ' (stale)' : ''}`);
                memoryCache.set(cacheKey, cached.data);
                
                // Если данные устарели, обновляем в фоне
                if (cached.stale) {
                    loadFreshData(cacheKey, staticPath, apiPath).catch(() => {});
                }
                
                return cached.data;
            }
        }
        
        // 3. Загружаем свежие данные
        return loadFreshData(cacheKey, staticPath, apiPath, timeout);
    }
    
    /**
     * Загрузка свежих данных
     */
    async function loadFreshData(cacheKey, staticPath, apiPath, timeout = 10000) {
        // Сначала пробуем статический файл
        try {
            console.log(`📁 Loading static: ${staticPath}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(staticPath, { 
                signal: controller.signal,
                cache: 'default' // Используем браузерный кэш
            });
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    console.log(`✅ Static loaded: ${staticPath}`);
                    memoryCache.set(cacheKey, result.data);
                    localCache.set(cacheKey, result.data);
                    return result.data;
                }
            }
        } catch (e) {
            console.warn(`⚠️ Static file not available: ${staticPath}`, e.message);
        }
        
        // Fallback на API
        try {
            console.log(`🔄 Loading API: ${apiPath}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(apiPath, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    console.log(`✅ API loaded: ${apiPath}`);
                    memoryCache.set(cacheKey, result.data);
                    localCache.set(cacheKey, result.data);
                    return result.data;
                }
            }
        } catch (e) {
            console.error(`❌ API failed: ${apiPath}`, e.message);
        }
        
        throw new Error(`Failed to load data: ${cacheKey}`);
    }
    
    // ===== Публичные функции =====
    
    /**
     * Загрузка списка стран
     */
    async function loadCountries(options = {}) {
        return loadData(
            'countries',
            '/data/countries.json',
            '/api/esimgo/countries',
            options
        );
    }
    
    /**
     * Загрузка Global планов
     */
    async function loadGlobalPlans(options = {}) {
        return loadData(
            'plans_global',
            '/data/plans-global.json',
            '/api/esimgo/plans?category=global',
            options
        );
    }
    
    /**
     * Загрузка Regional планов
     */
    async function loadRegionPlans(region, options = {}) {
        const regionSlug = region.toLowerCase().replace(/\s+/g, '-');
        return loadData(
            `plans_region_${regionSlug}`,
            `/data/plans-region-${regionSlug}.json`,
            `/api/esimgo/region-plans?region=${encodeURIComponent(region)}`,
            options
        );
    }
    
    /**
     * Загрузка Local планов для страны
     */
    async function loadLocalPlans(countryCode, options = {}) {
        const code = countryCode.toLowerCase();
        return loadData(
            `plans_local_${code}`,
            `/data/plans-local-${code}.json`,
            `/api/esimgo/plans?country=${countryCode.toUpperCase()}&category=local`,
            options
        );
    }
    
    /**
     * Предзагрузка всех основных данных
     */
    async function preloadAll() {
        console.log('🚀 Preloading all data...');
        const start = Date.now();
        
        try {
            // Загружаем параллельно
            await Promise.all([
                loadCountries().catch(e => console.warn('Preload countries failed:', e)),
                loadGlobalPlans().catch(e => console.warn('Preload global failed:', e))
            ]);
            
            console.log(`✅ Preload complete in ${Date.now() - start}ms`);
        } catch (e) {
            console.warn('Preload partial failure:', e);
        }
    }
    
    /**
     * Очистка всего кэша
     */
    function clearCache() {
        memoryCache.clear();
        localCache.cleanup();
        
        // Удаляем все записи нашего кэша
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CACHE_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        console.log('🗑️ Cache cleared');
    }
    
    /**
     * Получить статистику кэша
     */
    function getCacheStats() {
        const stats = {
            memoryKeys: Array.from(memoryCache.keys()),
            localStorageKeys: [],
            totalSize: 0
        };
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CACHE_PREFIX)) {
                const value = localStorage.getItem(key);
                stats.localStorageKeys.push(key.replace(CACHE_PREFIX, ''));
                stats.totalSize += value.length;
            }
        }
        
        stats.totalSizeKB = (stats.totalSize / 1024).toFixed(1);
        return stats;
    }
    
    // Экспортируем в глобальный объект
    window.DataLoader = {
        loadCountries,
        loadGlobalPlans,
        loadRegionPlans,
        loadLocalPlans,
        preloadAll,
        clearCache,
        getCacheStats
    };
    
    // Предзагрузка при idle (Safari не поддерживает requestIdleCallback)
    const schedulePreload = () => {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(preloadAll);
        } else {
            setTimeout(preloadAll, 100);
        }
    };
    
    if (document.readyState === 'complete') {
        schedulePreload();
    } else {
        window.addEventListener('load', schedulePreload);
    }
    
})();

