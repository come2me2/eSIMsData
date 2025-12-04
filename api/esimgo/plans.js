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

const esimgoClient = require('./client');

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
    
    // Сортируем планы
    plans.standard.sort((a, b) => {
        // Сначала по длительности, потом по объему данных
        if (a.durationDays !== b.durationDays) {
            return a.durationDays - b.durationDays;
        }
        return a.dataAmount - b.dataAmount;
    });
    
    plans.unlimited.sort((a, b) => {
        return a.durationDays - b.durationDays;
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
        const { country, region, perPage = 1000 } = req.query;
        
        console.log('Plans API request:', { country, region, perPage });
        
        // Получаем каталог
        const catalogueOptions = {
            perPage: parseInt(perPage)
        };
        
        if (region) {
            catalogueOptions.region = region;
        }
        
        // getCatalogue принимает (countryCode, options)
        // countryCode - строка или null
        // options - объект с дополнительными параметрами
        const countryCode = country ? country.toUpperCase() : null;
        const catalogue = await esimgoClient.getCatalogue(countryCode, catalogueOptions);
        
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
            region: req.query.region
        });
        
        // Возвращаем пустой список планов вместо ошибки
        // Это позволит использовать fallback на клиенте
        return res.status(200).json({
            success: false,
            error: error.message || 'Failed to get plans',
            data: {
                standard: [],
                unlimited: [],
                total: 0
            },
            meta: {
                country: req.query.country || null,
                region: req.query.region || null,
                error: true
            }
        });
    }
};

