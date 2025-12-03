/**
 * Отладочный endpoint для проверки сырого ответа от /catalogue API
 * Endpoint: GET /api/esimgo/catalogue-debug
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
        const { country } = req.query;
        
        console.log('Catalogue debug request:', {
            country: country || 'all',
            hasApiKey: !!process.env.ESIMGO_API_KEY,
            apiUrl: process.env.ESIMGO_API_URL || 'https://api.esim-go.com/v2.4'
        });
        
        // Получаем каталог
        const catalogue = await esimgoClient.getCatalogue(country || null, {
            perPage: 50 // Ограничиваем для отладки
        });
        
        // Детальная информация о структуре ответа
        const debugInfo = {
            rawType: typeof catalogue,
            isArray: Array.isArray(catalogue),
            keys: catalogue ? Object.keys(catalogue) : [],
            length: Array.isArray(catalogue) ? catalogue.length : null,
            hasData: !!catalogue?.data,
            hasBundles: !!catalogue?.bundles,
            hasItems: !!catalogue?.items,
            sampleItem: Array.isArray(catalogue) 
                ? catalogue[0] 
                : (catalogue?.data?.[0] || catalogue?.bundles?.[0] || catalogue?.items?.[0] || null),
            firstItemKeys: Array.isArray(catalogue) && catalogue[0]
                ? Object.keys(catalogue[0])
                : (catalogue?.data?.[0] ? Object.keys(catalogue.data[0]) : []),
            fullResponse: JSON.stringify(catalogue, null, 2).substring(0, 2000) // Первые 2000 символов
        };
        
        return res.status(200).json({
            success: true,
            debug: debugInfo,
            raw: catalogue
        });
        
    } catch (error) {
        console.error('Catalogue debug error:', {
            message: error.message,
            stack: error.stack,
            country: req.query.country
        });
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch catalogue',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

