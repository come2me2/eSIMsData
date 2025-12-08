/**
 * Тестовый endpoint для проверки структуры bundles для Africa
 * GET /api/esimgo/test-africa
 */

const esimgoClient = require('../_lib/esimgo/client');

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        console.log('Fetching Africa bundles from Standard Fixed group...');
        
        // Получаем все bundles из группы Standard Fixed
        const catalogue = await esimgoClient.getCatalogue(null, {
            group: 'Standard Fixed',
            perPage: 1000
        });
        
        const bundles = Array.isArray(catalogue) 
            ? catalogue 
            : (catalogue?.bundles || catalogue?.data || []);
        
        // Фильтруем bundles для Africa
        const africaBundles = bundles.filter(bundle => {
            const countries = bundle.countries || [];
            return countries.some(country => {
                if (typeof country === 'object' && country !== null) {
                    const region = country.region || country.Region || country.REGION;
                    return region === 'Africa' || region?.toLowerCase() === 'africa';
                }
                return false;
            });
        });
        
        // Берем первые 5 bundles для анализа
        const sampleBundles = africaBundles.slice(0, 5).map(bundle => {
            // Собираем все возможные поля с ценами
            const priceFields = {};
            Object.keys(bundle).forEach(key => {
                const lowerKey = key.toLowerCase();
                if (lowerKey.includes('price') || 
                    lowerKey.includes('cost') || 
                    lowerKey.includes('amount') ||
                    lowerKey.includes('fee')) {
                    priceFields[key] = bundle[key];
                }
            });
            
            return {
                name: bundle.name,
                dataAmount: bundle.dataAmount,
                duration: bundle.duration,
                countries: bundle.countries,
                priceFields: priceFields,
                allKeys: Object.keys(bundle)
            };
        });
        
        return res.status(200).json({
            success: true,
            data: {
                totalBundles: africaBundles.length,
                sampleBundles: sampleBundles,
                message: 'Check priceFields in sampleBundles to find correct price field'
            }
        });
        
    } catch (error) {
        console.error('Error fetching Africa bundles:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

