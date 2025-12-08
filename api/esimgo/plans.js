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
        // Форматируем цену правильно
        const priceValue = bundle.price || bundle.pricePerUnit || 0;
        const currency = bundle.currency || 'USD';
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
        const { country, region, perPage = 1000, useExcel } = req.query;
        
        console.log('Plans API request:', { country, region, perPage, useExcel });
        console.log('ESIMGO_API_KEY exists:', !!process.env.ESIMGO_API_KEY);
        
        const countryCode = country ? country.toUpperCase() : null;
        const isGlobal = req.query.global === 'true' || req.query.global === true;
        
        // Для Global категории (когда нет country и нет region, или явно указан global=true)
        // Global = множество стран, может быть fixed или unlimited
        if (isGlobal || (!countryCode && !region)) {
            try {
                const { getGlobalPlansFromExcel } = require('../_lib/esimgo/parse-excel');
                const excelPlans = getGlobalPlansFromExcel();
                
                // Преобразуем Excel планы в формат API
                const standard = excelPlans.standard.map(plan => ({
                    id: plan.sku || `excel-global-${plan.dataAmount}-${plan.duration}`,
                    bundle_name: plan.sku || '',
                    data: `${plan.dataAmount / 1000} GB`,
                    dataAmount: plan.dataAmount,
                    duration: `${plan.duration} Days`,
                    durationDays: plan.duration,
                    price: `$ ${plan.price.toFixed(2)}`,
                    priceValue: plan.price,
                    currency: plan.currency,
                    unlimited: false,
                    countries: [], // Global = множество стран, список может быть пустым или содержать все страны
                    description: plan.profile || '',
                    source: 'excel',
                    isGlobal: true
                }));
                
                const unlimited = excelPlans.unlimited.map(plan => ({
                    id: plan.sku || `excel-global-unlimited-${plan.duration}`,
                    bundle_name: plan.sku || '',
                    data: '∞ GB',
                    dataAmount: 0,
                    duration: `${plan.duration} Days`,
                    durationDays: plan.duration,
                    price: `$ ${plan.price.toFixed(2)}`,
                    priceValue: plan.price,
                    currency: plan.currency,
                    unlimited: true,
                    countries: [], // Global = множество стран
                    description: plan.profile || '',
                    source: 'excel',
                    isGlobal: true
                }));
                
                // Применяем дедупликацию
                const plans = groupBundlesIntoPlans([...standard, ...unlimited]);
                
                console.log('Global plans from Excel:', {
                    standardPlans: plans.standard.length,
                    unlimitedPlans: plans.unlimited.length
                });
                
                return res.status(200).json({
                    success: true,
                    data: {
                        standard: plans.standard,
                        unlimited: plans.unlimited,
                        total: plans.standard.length + plans.unlimited.length
                    },
                    meta: {
                        category: 'global',
                        source: 'excel',
                        message: 'Global plans loaded from Excel file'
                    }
                });
            } catch (excelError) {
                console.warn('Failed to load Global plans from Excel, falling back to API:', excelError.message);
                // Продолжаем с API как fallback
            }
        }
        
        // Для Local категории (когда передан country код без region) используем данные из Excel
        // Local = одна страна, может быть fixed или unlimited
        if (countryCode && !region) {
            try {
                const { getLocalPlansFromExcel } = require('../_lib/esimgo/parse-excel');
                const excelPlans = getLocalPlansFromExcel(countryCode);
                
                // Преобразуем Excel планы в формат API
                const standard = excelPlans.standard.map(plan => ({
                    id: plan.sku || `excel-${countryCode}-${plan.dataAmount}-${plan.duration}`,
                    bundle_name: plan.sku || '',
                    data: `${plan.dataAmount / 1000} GB`,
                    dataAmount: plan.dataAmount,
                    duration: `${plan.duration} Days`,
                    durationDays: plan.duration,
                    price: `$ ${plan.price.toFixed(2)}`,
                    priceValue: plan.price,
                    currency: plan.currency,
                    unlimited: false,
                    countries: [countryCode],
                    description: plan.profile || '',
                    source: 'excel'
                }));
                
                const unlimited = excelPlans.unlimited.map(plan => ({
                    id: plan.sku || `excel-${countryCode}-unlimited-${plan.duration}`,
                    bundle_name: plan.sku || '',
                    data: '∞ GB',
                    dataAmount: 0,
                    duration: `${plan.duration} Days`,
                    durationDays: plan.duration,
                    price: `$ ${plan.price.toFixed(2)}`,
                    priceValue: plan.price,
                    currency: plan.currency,
                    unlimited: true,
                    countries: [countryCode],
                    description: plan.profile || '',
                    source: 'excel'
                }));
                
                // Применяем дедупликацию
                const plans = groupBundlesIntoPlans([...standard, ...unlimited]);
                
                console.log('Plans from Excel:', {
                    country: countryCode,
                    standardPlans: plans.standard.length,
                    unlimitedPlans: plans.unlimited.length
                });
                
                return res.status(200).json({
                    success: true,
                    data: {
                        standard: plans.standard,
                        unlimited: plans.unlimited,
                        total: plans.standard.length + plans.unlimited.length
                    },
                    meta: {
                        country: countryCode,
                        source: 'excel',
                        message: 'Plans loaded from Excel file'
                    }
                });
            } catch (excelError) {
                console.warn('Failed to load plans from Excel, falling back to API:', excelError.message);
                // Продолжаем с API как fallback
            }
        }
        
        // Получаем каталог из API
        const catalogueOptions = {
            perPage: parseInt(perPage)
        };
        
        if (region) {
            catalogueOptions.region = region;
        }
        
        console.log('Calling getCatalogue with:', { countryCode, options: catalogueOptions });
        
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
            catalogue = await esimgoClient.getCatalogue(countryCode, catalogueOptions);
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
        const bundles = Array.isArray(catalogue) 
            ? catalogue 
            : (catalogue?.bundles || catalogue?.data || []);
        
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
                    message: 'No bundles found'
                }
            });
        }
        
        // Группируем в планы
        const plans = groupBundlesIntoPlans(bundles);
        
        console.log('Plans grouped:', {
            country: country || 'all',
            region: region || 'all',
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
                totalBundles: bundles.length
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

