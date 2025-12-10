/**
 * Тестовый endpoint для проверки bundles для Northern Cyprus (CYP) и Cyprus (CY)
 * GET /api/esimgo/test-cyprus?country=CYP
 */

const esimgoClient = require('./client');

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const countryCode = (req.query.country || 'CYP').toUpperCase();
        console.log(`Fetching bundles for ${countryCode} from Standard Fixed group...`);
        
        // Получаем все bundles из группы Standard Fixed
        let allBundles = [];
        let page = 1;
        const perPage = 1000;
        let hasMore = true;
        
        while (hasMore) {
            const catalogue = await esimgoClient.getCatalogue(null, {
                group: 'Standard Fixed',
                perPage: perPage,
                page: page
            });
            
            const bundles = Array.isArray(catalogue) 
                ? catalogue 
                : (catalogue?.bundles || catalogue?.data || []);
            
            allBundles = allBundles.concat(bundles);
            
            // Проверяем, есть ли еще страницы
            if (catalogue?.pageCount && page < catalogue.pageCount) {
                page++;
            } else if (catalogue?.rows && allBundles.length < catalogue.rows) {
                page++;
            } else {
                hasMore = false;
            }
            
            // Защита от бесконечного цикла
            if (page > 10) {
                hasMore = false;
            }
        }
        
        console.log(`Total bundles fetched: ${allBundles.length}`);
        
        // Ищем все bundles, связанные с Cyprus (CY) или Northern Cyprus (CYP)
        const cyprusBundles = allBundles.filter(bundle => {
            const bundleName = (bundle.name || '').toUpperCase();
            const countries = bundle.countries || [];
            
            // Проверяем по названию
            if (bundleName.includes('_CY_') || bundleName.includes('_CYP_') || 
                bundleName.includes('_CY ') || bundleName.includes('_CYP ') ||
                bundleName.endsWith('_CY') || bundleName.endsWith('_CYP') ||
                bundleName.startsWith('CY_') || bundleName.startsWith('CYP_')) {
                return true;
            }
            
            // Проверяем по countries
            return countries.some(country => {
                if (typeof country === 'string') {
                    return country.toUpperCase() === 'CY' || country.toUpperCase() === 'CYP';
                } else if (typeof country === 'object' && country !== null) {
                    const iso = (country.iso || country.ISO || country.code || '').toUpperCase();
                    const name = (country.name || country.Name || '').toUpperCase();
                    return iso === 'CY' || iso === 'CYP' || 
                           name.includes('CYPRUS') || name.includes('NORTHERN');
                }
                return false;
            });
        });
        
        console.log(`Found ${cyprusBundles.length} bundles related to Cyprus/Northern Cyprus`);
        
        // Разделяем на CY и CYP
        const cyBundles = [];
        const cypBundles = [];
        const ambiguousBundles = [];
        
        cyprusBundles.forEach(bundle => {
            const bundleName = (bundle.name || '').toUpperCase();
            const countries = bundle.countries || [];
            let isCY = false;
            let isCYP = false;
            
            // Проверяем по названию
            if (bundleName.includes('_CYP_') || bundleName.includes('_CYP ') || 
                bundleName.endsWith('_CYP') || bundleName.startsWith('CYP_')) {
                isCYP = true;
            }
            if (bundleName.includes('_CY_') || bundleName.includes('_CY ') || 
                bundleName.endsWith('_CY') || bundleName.startsWith('CY_')) {
                // Проверяем, не является ли это CYP
                if (!bundleName.includes('_CYP_') && !bundleName.includes('_CYP ') && 
                    !bundleName.endsWith('_CYP') && !bundleName.startsWith('CYP_')) {
                    isCY = true;
                }
            }
            
            // Проверяем по countries
            countries.forEach(country => {
                if (typeof country === 'string') {
                    if (country.toUpperCase() === 'CYP') {
                        isCYP = true;
                    } else if (country.toUpperCase() === 'CY') {
                        isCY = true;
                    }
                } else if (typeof country === 'object' && country !== null) {
                    const iso = (country.iso || country.ISO || country.code || '').toUpperCase();
                    const name = (country.name || country.Name || '').toUpperCase();
                    if (iso === 'CYP' || name.includes('NORTHERN')) {
                        isCYP = true;
                    } else if (iso === 'CY' && !name.includes('NORTHERN')) {
                        isCY = true;
                    }
                }
            });
            
            if (isCYP && !isCY) {
                cypBundles.push(bundle);
            } else if (isCY && !isCYP) {
                cyBundles.push(bundle);
            } else {
                ambiguousBundles.push(bundle);
            }
        });
        
        // Фильтруем по запрошенному коду
        let resultBundles = [];
        if (countryCode === 'CYP') {
            resultBundles = cypBundles;
        } else if (countryCode === 'CY') {
            resultBundles = cyBundles;
        } else {
            resultBundles = cyprusBundles;
        }
        
        // Сортируем по названию для удобства
        resultBundles.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        return res.status(200).json({
            success: true,
            requestedCountry: countryCode,
            totalBundles: allBundles.length,
            cyprusRelatedBundles: cyprusBundles.length,
            cyBundles: cyBundles.length,
            cypBundles: cypBundles.length,
            ambiguousBundles: ambiguousBundles.length,
            resultBundles: resultBundles.length,
            bundles: resultBundles.map(b => ({
                name: b.name,
                sku: b.sku,
                price: b.price,
                pricePerUnit: b.pricePerUnit,
                dataAmount: b.dataAmount,
                duration: b.duration,
                countries: b.countries,
                country: b.country,
                countryCode: b.countryCode,
                iso: b.iso
            })),
            // Для отладки
            sampleCY: cyBundles.slice(0, 3).map(b => ({
                name: b.name,
                price: b.price,
                countries: b.countries
            })),
            sampleCYP: cypBundles.slice(0, 3).map(b => ({
                name: b.name,
                price: b.price,
                countries: b.countries
            })),
            sampleAmbiguous: ambiguousBundles.slice(0, 3).map(b => ({
                name: b.name,
                price: b.price,
                countries: b.countries
            }))
        });
        
    } catch (error) {
        console.error('Error in test-cyprus:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
};

