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
        
        // Фильтруем bundles для Africa - ищем региональные bundles
        // Региональные bundles могут иметь:
        // 1. country.name === 'Africa' (сам регион как страна)
        // 2. country.region === 'Africa' и country.iso === 'Africa' или подобное
        // 3. Название bundle содержит 'AFRICA' или 'AF'
        const africaBundles = bundles.filter(bundle => {
            const countries = bundle.countries || [];
            const name = (bundle.name || '').toUpperCase();
            
            // Проверяем, является ли это региональным bundle (не для конкретной страны)
            return countries.some(country => {
                if (typeof country === 'object' && country !== null) {
                    const countryName = (country.name || '').toLowerCase();
                    const countryIso = (country.iso || '').toUpperCase();
                    const region = country.region || country.Region || country.REGION;
                    
                    // Региональный bundle: name или iso = 'Africa'
                    if (countryName === 'africa' || countryIso === 'AFRICA' || countryIso === 'AF') {
                        return true;
                    }
                    
                    // Или region = 'Africa' и это не стандартный ISO код страны
                    if (region === 'Africa' && countryIso.length > 2) {
                        return true;
                    }
                }
                return false;
            }) || name.includes('AFRICA') || name.includes('_AF_');
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
                totalBundlesWithRegionAfrica: allAfricaRegionBundles.length,
                regionalBundlesCount: africaBundles.length,
                countryBundlesCount: allAfricaRegionBundles.length - africaBundles.length,
                regionalBundles: regionalBundles.map(b => ({
                    name: b.name,
                    dataAmount: b.dataAmount,
                    duration: b.duration,
                    price: b.price,
                    countries: b.countries
                })),
                sampleBundles: sampleBundles,
                message: 'Regional bundles should have country.name=Africa or country.iso=AFRICA'
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

