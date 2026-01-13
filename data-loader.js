/**
 * Оптимизированный загрузчик данных с кэшированием
 * Загружает данные из статических JSON файлов (моментально)
 * с fallback на API endpoints
 */

(function() {
    'use strict';
    
    const CACHE_PREFIX = 'esim_cache_';
    // Bump this to force-reset localStorage cache for all users
    // v16: Обновление для сортировки стран по алфавиту
    const CACHE_VERSION = 'v16';
    const CACHE_TTL = 1 * 60 * 60 * 1000; // 1 час (еще более частое обновление)
    
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
     * Оптимизированная загрузка: параллельная загрузка статики и API, выбираем быстрее загрузившийся
     */
    async function loadFreshData(cacheKey, staticPath, apiPath, timeout = 10000) {
        const staticTimeout = 500; // Очень короткий таймаут для статических файлов (500ms)
        
        // Загружаем статический файл и API параллельно, выбираем быстрее загрузившийся
        const staticPromise = (async () => {
            try {
                console.log(`📁 Loading static: ${staticPath}`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), staticTimeout);
                
                const response = await fetch(staticPath, { 
                    signal: controller.signal,
                    cache: 'default' // Используем браузерный кэш
                });
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        console.log(`✅ Static loaded: ${staticPath}`);
                        return result.data;
                    }
                }
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.warn(`⚠️ Static file not available: ${staticPath}`, e.message);
                }
            }
            return null;
        })();
        
        const apiPromise = (async () => {
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
                        return result.data;
                    }
                }
            } catch (e) {
                console.error(`❌ API failed: ${apiPath}`, e.message);
            }
            return null;
        })();
        
        // Ждем первый успешный результат (Promise.race не подходит, т.к. нужно проверить успешность)
        const results = await Promise.allSettled([staticPromise, apiPromise]);
        
        // Проверяем результаты в порядке приоритета: статика -> API
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                const data = result.value;
                memoryCache.set(cacheKey, data);
                localCache.set(cacheKey, data);
                return data;
            }
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
     * ВАЖНО: Всегда используем API для получения актуальных цен с наценкой
     * Статические файлы могут содержать устаревшие данные
     */
    async function loadGlobalPlans(options = {}) {
        // ВАЖНО:
        // 1) Для планов используем ТОЛЬКО memory cache + серверный API.
        // 2) НЕ сохраняем планы в localStorage, чтобы не держать устаревшие цены на клиенте.
        // 3) Пользователь всегда видит актуальную «серверную версию кэша» с наценкой.
        const cacheKey = 'plans_global';
        const apiPath = '/api/esimgo/plans?category=global';
        
        // 1. Проверяем memory cache (быстро, в рамках текущей сессии)
        if (!options.forceRefresh && memoryCache.has(cacheKey)) {
            console.log(`⚡ Memory cache hit: ${cacheKey}`);
            return memoryCache.get(cacheKey);
        }

        // 2. Загружаем из API (актуальные данные с правильной наценкой с сервера)
        try {
            console.log(`🔄 Loading Global plans from API: ${apiPath}`);
            const response = await fetch(apiPath);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    console.log(`✅ Global plans loaded from API`);
                    const data = result.data;
                    // Сохраняем ТОЛЬКО в memory cache (без localStorage)
                    memoryCache.set(cacheKey, data);
                    return data;
                }
            }
        } catch (e) {
            console.error(`❌ API failed: ${apiPath}`, e.message);
        }
        
        // 3. Fallback: если API не доступен, пробуем статический файл (без наценки)
        try {
            console.log(`⚠️ API failed, trying static file as fallback...`);
            const response = await fetch('/data/plans-global.json');
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    console.log(`✅ Global plans loaded from static file (fallback)`);
                    return result.data;
                }
            }
        } catch (e) {
            console.warn(`⚠️ Static file also failed:`, e.message);
        }
        
        throw new Error(`Failed to load Global plans`);
    }
    
    /**
     * Загрузка Regional планов
     * ВАЖНО: Всегда используем API для получения актуальных цен с наценкой
     */
    async function loadRegionPlans(region, options = {}) {
        const regionSlug = region.toLowerCase().replace(/\s+/g, '-');
        const cacheKey = `plans_region_${regionSlug}`;
        const apiPath = `/api/esimgo/region-plans?region=${encodeURIComponent(region)}`;
        
        // 1. Проверяем memory cache (быстро, в рамках текущей сессии)
        if (!options.forceRefresh && memoryCache.has(cacheKey)) {
            console.log(`⚡ Memory cache hit: ${cacheKey}`);
            return memoryCache.get(cacheKey);
        }

        // 2. Загружаем из API (актуальные данные с наценкой)
        try {
            console.log(`🔄 Loading Region plans from API: ${apiPath}`);
            const response = await fetch(apiPath);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    console.log(`✅ Region plans loaded from API`);
                    const data = result.data;
                    // Сохраняем ТОЛЬКО в memory cache (без localStorage)
                    memoryCache.set(cacheKey, data);
                    return data;
                }
            }
        } catch (e) {
            console.error(`❌ API failed: ${apiPath}`, e.message);
        }
        
        // Fallback: статический файл
        try {
            const response = await fetch(`/data/plans-region-${regionSlug}.json`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    console.log(`✅ Region plans loaded from static file (fallback)`);
                    return result.data;
                }
            }
        } catch (e) {
            console.warn(`⚠️ Static file also failed:`, e.message);
        }
        
        throw new Error(`Failed to load Region plans for ${region}`);
    }
    
    /**
     * Загрузка Local планов для страны
     * ВАЖНО: Всегда используем API для получения актуальных цен с наценкой
     */
    async function loadLocalPlans(countryCode, options = {}) {
        const code = countryCode.toLowerCase();
        const cacheKey = `plans_local_${code}`;
        const apiPath = `/api/esimgo/plans?country=${countryCode.toUpperCase()}&category=local`;
        
        // 1. Проверяем memory cache (быстро, в рамках текущей сессии)
        if (!options.forceRefresh && memoryCache.has(cacheKey)) {
            console.log(`⚡ Memory cache hit: ${cacheKey}`);
            return memoryCache.get(cacheKey);
        }

        // 2. Загружаем из API (актуальные данные с наценкой)
        try {
            console.log(`🔄 Loading Local plans from API: ${apiPath}`);
            const response = await fetch(apiPath);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    console.log(`✅ Local plans loaded from API`);
                    const data = result.data;
                    // Сохраняем ТОЛЬКО в memory cache (без localStorage)
                    memoryCache.set(cacheKey, data);
                    return data;
                }
            }
        } catch (e) {
            console.error(`❌ API failed: ${apiPath}`, e.message);
        }
        
        // Fallback: статический файл
        try {
            const response = await fetch(`/data/plans-local-${code}.json`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    console.log(`✅ Local plans loaded from static file (fallback)`);
                    return result.data;
                }
            }
        } catch (e) {
            console.warn(`⚠️ Static file also failed:`, e.message);
        }
        
        throw new Error(`Failed to load Local plans for ${countryCode}`);
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
        // Очищаем только memory cache и устаревшие записи localStorage.
        // НЕ трогаем актуальные записи, чтобы избежать лишних запросов.
        memoryCache.clear();
        localCache.cleanup();
        console.log('🗑️ Cache cleared (memory + stale localStorage)');
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
    
    // АГРЕССИВНАЯ очистка старого кэша при загрузке
    // Удаляем ВСЕ записи с префиксом кэша, чтобы гарантировать свежие данные
    if (typeof window !== 'undefined' && window.localStorage) {
        try {
            const allCacheKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(CACHE_PREFIX)) {
                    allCacheKeys.push(key);
                }
            }
            
            if (allCacheKeys.length > 0) {
                // Проверяем версию каждой записи
                const oldVersionKeys = [];
                const currentVersionKeys = [];
                
                allCacheKeys.forEach(key => {
                    try {
                        const item = JSON.parse(localStorage.getItem(key));
                        if (item.version && item.version !== CACHE_VERSION) {
                            oldVersionKeys.push(key);
                        } else if (item.version === CACHE_VERSION) {
                            currentVersionKeys.push(key);
                        } else {
                            // Если нет версии или не удалось распарсить - удаляем
                            oldVersionKeys.push(key);
                        }
                    } catch (e) {
                        // Если не удалось распарсить, удаляем
                        oldVersionKeys.push(key);
                    }
                });
                
                if (oldVersionKeys.length > 0) {
                    console.log(`🔄 Clearing ${oldVersionKeys.length} old cache entries (version mismatch)`);
                    oldVersionKeys.forEach(key => localStorage.removeItem(key));
                }
                
                // ВАЖНО: Для v14 очищаем ВСЕ записи кэша (включая все версии), чтобы создать новый кэш с правильными ценами
                // Это гарантирует, что пользователи получат актуальные цены из API
                console.log(`🔄 Force clearing ALL cache entries (${allCacheKeys.length} total) to create fresh cache`);
                allCacheKeys.forEach(key => localStorage.removeItem(key));
                
                // Очищаем memory cache
                memoryCache.clear();
                console.log(`✅ Cache cleanup complete. Will load fresh data from API.`);
            }
        } catch (e) {
            console.warn('Cache cleanup error:', e);
            // В случае ошибки все равно очищаем memory cache
            memoryCache.clear();
        }
    }
    
})();

