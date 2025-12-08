/**
 * eSIM Go API - Получение региональных планов (тарифов)
 * Endpoint: GET /api/esimgo/region-plans
 * 
 * Параметры:
 * - region: название региона приложения (Africa, Asia, Europe, North America, Latin America, Oceania, Balkanas, Central Eurasia)
 * 
 * Возвращает только fixed тарифы (без unlimited) для региональных eSIM
 */

const esimgoClient = require('../_lib/esimgo/client');
const { getAPIRegions, isLatinAmerica } = require('../_lib/esimgo/region-mapping');

/**
 * Дедупликация тарифов для Latin America
 * Выбирает тариф с минимальной ценой для каждой комбинации страны/данных/длительности
 * @param {Array} bundles - массив bundles из разных регионов API
 * @returns {Array} - дедуплицированный массив bundles
 */
function deduplicateLatinAmerica(bundles) {
    // Группируем по стране, объему данных и длительности
    const plansMap = new Map();
    
    bundles.forEach(bundle => {
        // Получаем коды стран из bundle
        const countries = bundle.countries || [];
        if (countries.length === 0) {
            const countryCode = bundle.country || bundle.countryCode || bundle.iso;
            if (countryCode) {
                countries.push(countryCode);
            }
        }
        
        // Для каждой страны создаем ключ
        countries.forEach(countryCode => {
            const dataAmount = bundle.dataAmount || 0;
            const duration = bundle.duration || 0;
            const key = `${countryCode}_${dataAmount}_${duration}`;
            
            const priceValue = typeof bundle.price === 'number' 
                ? bundle.price 
                : parseFloat(bundle.price) || 0;
            
            if (!plansMap.has(key)) {
                plansMap.set(key, {
                    ...bundle,
                    countryCode: countryCode,
                    priceValue: priceValue
                });
            } else {
                const existing = plansMap.get(key);
                const existingPrice = existing.priceValue || 0;
                
                // Выбираем bundle с минимальной ценой
                if (priceValue < existingPrice) {
                    plansMap.set(key, {
                        ...bundle,
                        countryCode: countryCode,
                        priceValue: priceValue
                    });
                }
            }
        });
    });
    
    return Array.from(plansMap.values());
}

/**
 * Получить bundles из API для региона
 * @param {string} apiRegion - регион API
 * @returns {Promise<Array>}
 */
async function getBundlesForAPIRegion(apiRegion) {
    try {
        const catalogue = await esimgoClient.getCatalogue(null, {
            region: apiRegion,
            perPage: 1000
        });
        
        const bundles = Array.isArray(catalogue) 
            ? catalogue 
            : (catalogue?.bundles || catalogue?.data || []);
        
        // Фильтруем только fixed тарифы (не unlimited)
        return bundles.filter(bundle => !bundle.unlimited);
    } catch (error) {
        console.error(`Error fetching bundles for region ${apiRegion}:`, error);
        return [];
    }
}

/**
 * Группировка bundles в планы (только standard, без unlimited)
 */
function groupBundlesIntoPlans(bundles) {
    const plans = {
        standard: []
    };
    
    bundles.forEach(bundle => {
        const priceValue = bundle.price || bundle.pricePerUnit || 0;
        const currency = bundle.currency || 'USD';
        const priceFormatted = currency === 'USD' 
            ? `$ ${priceValue.toFixed(2)}`
            : `${currency} ${priceValue.toFixed(2)}`;
        
        const plan = {
            id: bundle.name,
            bundle_name: bundle.name,
            data: `${bundle.dataAmount / 1000} GB`,
            dataAmount: bundle.dataAmount,
            duration: `${bundle.duration} Days`,
            durationDays: bundle.duration,
            price: priceFormatted,
            priceValue: priceValue,
            currency: currency,
            unlimited: false,
            countries: bundle.countries || [],
            description: bundle.description || '',
            region: bundle.region || null
        };
        
        plans.standard.push(plan);
    });
    
    // Дедупликация стандартных планов
    const standardMap = new Map();
    plans.standard.forEach(plan => {
        const priceValue = typeof plan.priceValue === 'number' 
            ? plan.priceValue 
            : parseFloat(plan.priceValue) || 0;
        plan.priceValue = priceValue;
        
        const key = `${plan.durationDays}-${plan.dataAmount}`;
        
        if (!standardMap.has(key)) {
            standardMap.set(key, plan);
        } else {
            const existing = standardMap.get(key);
            const existingPrice = typeof existing.priceValue === 'number' 
                ? existing.priceValue 
                : parseFloat(existing.priceValue) || 0;
            
            if (plan.currency === existing.currency) {
                if (priceValue < existingPrice) {
                    standardMap.set(key, plan);
                }
            } else if (plan.currency === 'USD' && existing.currency !== 'USD') {
                standardMap.set(key, plan);
            } else if (existing.currency === 'USD' && plan.currency !== 'USD') {
                // Оставляем существующий USD план
            } else if (priceValue < existingPrice) {
                standardMap.set(key, plan);
            }
        }
    });
    
    plans.standard = Array.from(standardMap.values()).sort((a, b) => {
        if (a.durationDays !== b.durationDays) {
            return a.durationDays - b.durationDays;
        }
        return a.dataAmount - b.dataAmount;
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
    
    try {
        const { region } = req.query;
        
        if (!region) {
            return res.status(400).json({
                success: false,
                error: 'Region parameter is required'
            });
        }
        
        console.log('Region plans API request:', { region });
        
        // Получаем регионы API для региона приложения
        const apiRegions = getAPIRegions(region);
        
        if (apiRegions.length === 0) {
            return res.status(400).json({
                success: false,
                error: `Unknown region: ${region}`
            });
        }
        
        // Получаем bundles из всех соответствующих регионов API
        let allBundles = [];
        
        for (const apiRegion of apiRegions) {
            const bundles = await getBundlesForAPIRegion(apiRegion);
            // Добавляем информацию о регионе API к каждому bundle
            bundles.forEach(bundle => {
                bundle.apiRegion = apiRegion;
            });
            allBundles = allBundles.concat(bundles);
        }
        
        // Для Latin America делаем дедупликацию по минимальной цене
        if (isLatinAmerica(region)) {
            allBundles = deduplicateLatinAmerica(allBundles);
        }
        
        if (allBundles.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    standard: [],
                    unlimited: [],
                    total: 0
                },
                meta: {
                    region: region,
                    apiRegions: apiRegions,
                    message: 'No bundles found'
                }
            });
        }
        
        // Группируем в планы
        const plans = groupBundlesIntoPlans(allBundles);
        
        console.log('Region plans grouped:', {
            region: region,
            apiRegions: apiRegions,
            standardPlans: plans.standard.length,
            totalBundles: allBundles.length
        });
        
        return res.status(200).json({
            success: true,
            data: {
                standard: plans.standard,
                unlimited: [], // Для регионов всегда пустой массив
                total: plans.standard.length
            },
            meta: {
                region: region,
                apiRegions: apiRegions,
                bundlesCount: allBundles.length
            }
        });
        
    } catch (error) {
        console.error('Region plans API error:', error);
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch region plans'
        });
    }
};

