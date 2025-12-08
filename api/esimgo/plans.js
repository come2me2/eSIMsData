/**
 * eSIM Go API - Получение планов (тарифов) для страны/региона
 * Endpoint: GET /api/esimgo/plans
 * 
 * Параметры:
 * - country: код страны (ISO, опционально)
 * - region: название региона (опционально)
 * - groupBy: группировка (duration, dataAmount, unlimited)
 * 
 * Возвращает структурированные планы с реальными ценами из каталога
 */

// Загружаем client модуль в начале файла
let esimgoClient;
try {
    esimgoClient = require('../_lib/esimgo/client');
    if (!esimgoClient || !esimgoClient.getCatalogue) {
        throw new Error('Client module loaded but getCatalogue function not found');
    }
} catch (error) {
    console.error('CRITICAL: Failed to load client module:', {
        message: error.message,
        stack: error.stack,
        name: error.name
    });
    // Не устанавливаем esimgoClient, чтобы проверка сработала
}

/**
 * Группировка bundles в планы
 */
function groupBundlesIntoPlans(bundles) {
    const plans = {
        standard: [],
        unlimited: []
    };
    
    // Группируем по типу (unlimited или нет)
    bundles.forEach(bundle => {
        // Извлекаем цену из разных возможных форматов
        let priceValue = 0;
        let currency = 'USD';
        
        if (bundle.price) {
            if (typeof bundle.price === 'number') {
                // Цена как число (в центах или долларах)
                priceValue = bundle.price;
            } else if (typeof bundle.price === 'object' && bundle.price.amount) {
                // Цена как объект { amount, currency }
                priceValue = typeof bundle.price.amount === 'number' 
                    ? bundle.price.amount 
                    : parseFloat(bundle.price.amount) || 0;
                currency = bundle.price.currency || 'USD';
            } else if (typeof bundle.price === 'string') {
                // Цена как строка
                priceValue = parseFloat(bundle.price) || 0;
            }
        } else if (bundle.pricePerUnit) {
            priceValue = typeof bundle.pricePerUnit === 'number' 
                ? bundle.pricePerUnit 
                : parseFloat(bundle.pricePerUnit) || 0;
        }
        
        // Если цена в центах (больше 100), конвертируем в доллары
        if (priceValue > 100 && priceValue < 100000) {
            priceValue = priceValue / 100;
        }
        
        // Получаем валюту из bundle
        if (bundle.currency) {
            currency = bundle.currency;
        } else if (bundle.price && typeof bundle.price === 'object' && bundle.price.currency) {
            currency = bundle.price.currency;
        }
        
        const priceFormatted = currency === 'USD' 
            ? `$ ${priceValue.toFixed(2)}`
            : `${currency} ${priceValue.toFixed(2)}`;
        
        const plan = {
            id: bundle.name, // Используем bundle name как ID
            bundle_name: bundle.name,
            data: bundle.unlimited ? '∞ GB' : `${bundle.dataAmount / 1000} GB`,
            dataAmount: bundle.dataAmount,
            duration: `${bundle.duration} Days`,
            durationDays: bundle.duration,
            price: priceFormatted,
            priceValue: priceValue,
            currency: currency,
            unlimited: bundle.unlimited || false,
            countries: bundle.countries || [],
            description: bundle.description || ''
        };
        
        if (bundle.unlimited) {
            plans.unlimited.push(plan);
        } else {
            plans.standard.push(plan);
        }
    });
    
    // Дедупликация стандартных планов: оставляем только один вариант с минимальной ценой для каждой комбинации длительности и объема данных
    const standardMap = new Map();
    plans.standard.forEach(plan => {
        // Убеждаемся, что priceValue - это число
        const priceValue = typeof plan.priceValue === 'number' ? plan.priceValue : parseFloat(plan.priceValue) || 0;
        plan.priceValue = priceValue; // Обновляем значение на случай, если оно было строкой
        
        // Ключ: комбинация длительности и объема данных
        const key = `${plan.durationDays}_${plan.dataAmount}`;
        
        if (!standardMap.has(key)) {
            standardMap.set(key, plan);
        } else {
            // Если уже есть план с такой комбинацией, выбираем с минимальной ценой
            const existing = standardMap.get(key);
            const existingPrice = typeof existing.priceValue === 'number' ? existing.priceValue : parseFloat(existing.priceValue) || 0;
            
            // Если валюта одинаковая, выбираем минимальную цену
            // Если валюта разная, оставляем USD или первую найденную
            if (plan.currency === existing.currency) {
                if (priceValue < existingPrice) {
                    standardMap.set(key, plan);
                }
            } else if (plan.currency === 'USD' && existing.currency !== 'USD') {
                // Предпочитаем USD если есть выбор
                standardMap.set(key, plan);
            } else if (existing.currency === 'USD' && plan.currency !== 'USD') {
                // Оставляем существующий USD план
                // Ничего не делаем
            } else if (priceValue < existingPrice) {
                // Если валюты разные и обе не USD, выбираем минимальную цену
                standardMap.set(key, plan);
            }
        }
    });
    
    // Преобразуем Map обратно в массив и сортируем
    plans.standard = Array.from(standardMap.values()).sort((a, b) => {
        // Сначала по длительности, потом по объему данных
        if (a.durationDays !== b.durationDays) {
            return a.durationDays - b.durationDays;
        }
        return a.dataAmount - b.dataAmount;
    });
    
    console.log('Standard plans after deduplication:', {
        count: plans.standard.length,
        plans: plans.standard.map(p => ({ duration: p.durationDays, data: p.dataAmount, price: p.priceValue, currency: p.currency }))
    });
    
    // Дедупликация безлимитных планов: оставляем только один вариант с минимальной ценой для каждой длительности
    const unlimitedMap = new Map();
    plans.unlimited.forEach(plan => {
        const key = plan.durationDays;
        // Убеждаемся, что priceValue - это число
        const priceValue = typeof plan.priceValue === 'number' ? plan.priceValue : parseFloat(plan.priceValue) || 0;
        plan.priceValue = priceValue; // Обновляем значение на случай, если оно было строкой
        
        if (!unlimitedMap.has(key)) {
            unlimitedMap.set(key, plan);
        } else {
            // Если уже есть план с такой длительностью, выбираем с минимальной ценой
            // Учитываем валюту: сравниваем только планы с одинаковой валютой
            const existing = unlimitedMap.get(key);
            const existingPrice = typeof existing.priceValue === 'number' ? existing.priceValue : parseFloat(existing.priceValue) || 0;
            
            // Если валюта одинаковая, выбираем минимальную цену
            // Если валюта разная, оставляем USD или первую найденную
            if (plan.currency === existing.currency) {
                if (priceValue < existingPrice) {
                    unlimitedMap.set(key, plan);
                }
            } else if (plan.currency === 'USD' && existing.currency !== 'USD') {
                // Предпочитаем USD если есть выбор
                unlimitedMap.set(key, plan);
            } else if (existing.currency === 'USD' && plan.currency !== 'USD') {
                // Оставляем существующий USD план
                // Ничего не делаем
            } else if (priceValue < existingPrice) {
                // Если валюты разные и обе не USD, выбираем минимальную цену
                unlimitedMap.set(key, plan);
            }
        }
    });
    
    // Преобразуем Map обратно в массив и сортируем
    plans.unlimited = Array.from(unlimitedMap.values()).sort((a, b) => {
        return a.durationDays - b.durationDays;
    });
    
    console.log('Unlimited plans after deduplication:', {
        count: plans.unlimited.length,
        plans: plans.unlimited.map(p => ({ duration: p.durationDays, price: p.priceValue, currency: p.currency }))
    });
    
    return plans;
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    // Проверяем наличие API ключа сразу
    if (!process.env.ESIMGO_API_KEY) {
        console.error('ESIMGO_API_KEY not found in environment variables');
        return res.status(500).json({
            success: false,
            error: 'ESIMGO_API_KEY not configured',
            data: {
                standard: [],
                unlimited: [],
                total: 0
            }
        });
    }
    
    try {
        const { country, region, perPage = 1000, category } = req.query;
        
        console.log('Plans API request:', { country, region, perPage, category });
        console.log('ESIMGO_API_KEY exists:', !!process.env.ESIMGO_API_KEY);
        
        const countryCode = country ? country.toUpperCase() : null;
        const isGlobal = category === 'global' || req.query.global === 'true';
        const isLocal = category === 'local' || (countryCode && !region);
        
        // Получаем каталог из API eSIM Go
        const catalogueOptions = {
            perPage: parseInt(perPage)
        };
        
        // Для Region используем параметр region
        if (region) {
            catalogueOptions.region = region;
        }
        
        // Для Local запрашиваем конкретную страну
        // Для Global запрашиваем все (без country)
        const requestCountryCode = isLocal ? countryCode : null;
        
        console.log('Calling getCatalogue with:', { 
            countryCode: requestCountryCode, 
            options: catalogueOptions,
            category: isGlobal ? 'global' : (isLocal ? 'local' : (region ? 'region' : 'all'))
        });
        
        // Проверяем, что client загружен
        if (!esimgoClient) {
            const errorMsg = 'eSIM Go client module failed to load. Check server logs for details.';
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        
        if (typeof esimgoClient.getCatalogue !== 'function') {
            const errorMsg = 'getCatalogue function not found in client module';
            console.error(errorMsg, { clientKeys: Object.keys(esimgoClient) });
            throw new Error(errorMsg);
        }
        
        let catalogue;
        try {
            catalogue = await esimgoClient.getCatalogue(requestCountryCode, catalogueOptions);
            console.log('Catalogue received:', {
                isArray: Array.isArray(catalogue),
                hasBundles: !!catalogue?.bundles,
                bundlesCount: Array.isArray(catalogue) ? catalogue.length : (catalogue?.bundles?.length || 0)
            });
        } catch (catalogueError) {
            console.error('Error getting catalogue:', {
                message: catalogueError.message,
                stack: catalogueError.stack,
                name: catalogueError.name
            });
            throw new Error(`Failed to get catalogue: ${catalogueError.message}`);
        }
        
        // Извлекаем bundles
        let bundles = Array.isArray(catalogue) 
            ? catalogue 
            : (catalogue?.bundles || catalogue?.data || []);
        
        // Логируем структуру первого bundle для отладки
        if (bundles.length > 0) {
            console.log('Sample bundle structure:', {
                name: bundles[0].name,
                price: bundles[0].price,
                priceType: typeof bundles[0].price,
                pricePerUnit: bundles[0].pricePerUnit,
                currency: bundles[0].currency,
                countries: bundles[0].countries?.length || 0,
                dataAmount: bundles[0].dataAmount,
                duration: bundles[0].duration,
                unlimited: bundles[0].unlimited,
                bundleKeys: Object.keys(bundles[0])
            });
        }
        
        // Фильтруем bundles по категории
        if (isLocal && countryCode) {
            // Local: только bundles для одной страны
            bundles = bundles.filter(bundle => {
                const countries = bundle.countries || [];
                const bundleCountry = bundle.country || bundle.countryCode || bundle.iso;
                
                // Bundle должен содержать только одну страну и это должна быть запрошенная страна
                if (countries.length === 1) {
                    return countries[0].toUpperCase() === countryCode || 
                           (typeof countries[0] === 'object' && countries[0].code?.toUpperCase() === countryCode);
                }
                if (bundleCountry) {
                    return bundleCountry.toUpperCase() === countryCode;
                }
                return false;
            });
        } else if (isGlobal) {
            // Global: bundles с множеством стран (countries.length > 1) или без конкретной страны
            bundles = bundles.filter(bundle => {
                const countries = bundle.countries || [];
                const bundleCountry = bundle.country || bundle.countryCode || bundle.iso;
                
                // Global = множество стран или специальный признак Global
                return countries.length > 1 || 
                       (!bundleCountry && countries.length === 0) ||
                       bundle.name?.toLowerCase().includes('global');
            });
        }
        // Region: уже фильтруется через параметр region в API
        
        if (!bundles || bundles.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    standard: [],
                    unlimited: [],
                    total: 0
                },
                meta: {
                    country: country || null,
                    region: region || null,
                    category: isGlobal ? 'global' : (isLocal ? 'local' : (region ? 'region' : 'all')),
                    message: 'No bundles found'
                }
            });
        }
        
        // Группируем в планы
        const plans = groupBundlesIntoPlans(bundles);
        
        // Логируем примеры планов для отладки цен
        if (plans.standard.length > 0) {
            console.log('Sample standard plans:', plans.standard.slice(0, 3).map(p => ({
                name: p.bundle_name,
                price: p.price,
                priceValue: p.priceValue,
                currency: p.currency,
                data: p.data,
                duration: p.duration
            })));
        }
        if (plans.unlimited.length > 0) {
            console.log('Sample unlimited plans:', plans.unlimited.slice(0, 3).map(p => ({
                name: p.bundle_name,
                price: p.price,
                priceValue: p.priceValue,
                currency: p.currency,
                duration: p.duration
            })));
        }
        
        console.log('Plans grouped:', {
            country: country || 'all',
            region: region || 'all',
            category: isGlobal ? 'global' : (isLocal ? 'local' : (region ? 'region' : 'all')),
            standardPlans: plans.standard.length,
            unlimitedPlans: plans.unlimited.length,
            totalBundles: bundles.length
        });
        
        return res.status(200).json({
            success: true,
            data: {
                standard: plans.standard,
                unlimited: plans.unlimited,
                total: plans.standard.length + plans.unlimited.length
            },
            meta: {
                country: country || null,
                region: region || null,
                category: isGlobal ? 'global' : (isLocal ? 'local' : (region ? 'region' : 'all')),
                totalBundles: bundles.length,
                source: 'api'
            }
        });
        
    } catch (error) {
        console.error('Plans API error:', {
            message: error.message,
            stack: error.stack,
            country: req.query.country,
            region: req.query.region,
            name: error.name
        });
        
        // Возвращаем ошибку с деталями для отладки
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to get plans',
            errorType: error.name || 'UnknownError',
            data: {
                standard: [],
                unlimited: [],
                total: 0
            },
            meta: {
                country: req.query.country || null,
                region: req.query.region || null,
                error: true,
                debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });
    }
};

