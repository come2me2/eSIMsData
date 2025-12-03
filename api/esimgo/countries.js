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
        
        if (!catalogue || !catalogue.data) {
            return res.status(200).json({
                success: true,
                data: []
            });
        }

        // Извлекаем уникальные страны
        const countriesMap = new Map();
        
        catalogue.data.forEach(bundle => {
            const countryCode = bundle.country?.toUpperCase();
            if (!countryCode) return;
            
            if (!countriesMap.has(countryCode)) {
                countriesMap.set(countryCode, {
                    code: countryCode,
                    name: bundle.country_name || countryCode,
                    bundlesCount: 0
                });
            }
            
            const country = countriesMap.get(countryCode);
            country.bundlesCount++;
        });
        
        const countries = Array.from(countriesMap.values())
            .sort((a, b) => a.name.localeCompare(b.name));
        
        console.log('Countries fetched:', {
            total: countries.length
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

