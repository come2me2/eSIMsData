/**
 * eSIM Go API - Получение списка стран
 * Endpoint: GET /api/esimgo/countries
 * 
 * Возвращает список всех стран с доступными тарифами из eSIM Go
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
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // Получаем полный каталог
        const catalogue = await esimgoClient.getCatalogue(null);
        
        console.log('Catalogue structure:', {
            isArray: Array.isArray(catalogue),
            hasBundles: !!catalogue?.bundles,
            hasData: !!catalogue?.data,
            keys: catalogue && !Array.isArray(catalogue) ? Object.keys(catalogue) : []
        });
        
        // Извлекаем bundles - структура может быть разной
        const bundles = Array.isArray(catalogue) 
            ? catalogue 
            : (catalogue?.bundles || catalogue?.data || []);
        
        if (!bundles || bundles.length === 0) {
            console.warn('No bundles found in catalogue');
            return res.status(200).json({
                success: true,
                data: []
            });
        }
        
        console.log('Processing bundles:', { count: bundles.length });

        // Извлекаем уникальные страны
        const countriesMap = new Map();
        
        bundles.forEach(bundle => {
            // Обрабатываем разные варианты: одна страна или массив стран
            let countryCodes = [];
            
            // Вариант 1: массив стран в поле countries
            if (bundle.countries && Array.isArray(bundle.countries)) {
                countryCodes = bundle.countries.map(c => 
                    (typeof c === 'string' ? c : c.code || c.country || c.iso)?.toUpperCase()
                ).filter(Boolean);
            }
            // Вариант 2: одна страна в поле country
            else {
                const countryCode = (bundle.country || bundle.countryCode || bundle.iso)?.toUpperCase();
                if (countryCode) {
                    countryCodes = [countryCode];
                }
            }
            
            // Если нет кодов стран, пропускаем этот bundle
            if (countryCodes.length === 0) {
                return;
            }
            
            // Получаем название страны из разных возможных полей
            const countryName = bundle.country_name || bundle.countryName || bundle.name;
            
            // Добавляем каждую страну в карту
            countryCodes.forEach(countryCode => {
                if (!countriesMap.has(countryCode)) {
                    countriesMap.set(countryCode, {
                        code: countryCode,
                        name: countryName || countryCode, // Используем название из bundle или код
                        bundlesCount: 0
                    });
                }
                
                const country = countriesMap.get(countryCode);
                country.bundlesCount++;
            });
        });
        
        const countries = Array.from(countriesMap.values())
            .sort((a, b) => a.name.localeCompare(b.name));
        
        console.log('Countries fetched:', {
            total: countries.length,
            sample: countries.slice(0, 5).map(c => ({ code: c.code, name: c.name }))
        });
        
        return res.status(200).json({
            success: true,
            data: countries,
            meta: {
                total: countries.length
            }
        });
        
    } catch (error) {
        console.error('Countries API error:', error);
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch countries'
        });
    }
};

