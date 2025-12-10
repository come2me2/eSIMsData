/**
 * eSIM Go API - Получение каталога продуктов
 * Endpoint: GET /catalogue
 * Документация: https://docs.esim-go.com/api/v2_4/#tag/Catalogue
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
        
        console.log('Catalogue request:', {
            country: country || 'all',
            hasApiKey: !!process.env.ESIMGO_API_KEY
        });
        
        // Получаем каталог через /catalogue endpoint
        const catalogue = await esimgoClient.getCatalogue(country || null);
        
        // API возвращает объект с полем bundles: { bundles: [], pageCount, rows, pageSize }
        const bundles = Array.isArray(catalogue) 
            ? catalogue 
            : (catalogue?.bundles || catalogue?.data || []);
        
        console.log('Catalogue fetched:', {
            country: country || 'all',
            bundlesCount: bundles.length,
            rows: catalogue?.rows || 0,
            pageCount: catalogue?.pageCount || 0,
            pageSize: catalogue?.pageSize || 0,
            hasData: !!catalogue,
            keys: catalogue ? Object.keys(catalogue) : [],
            sampleBundle: bundles[0] || null
        });
        
        return res.status(200).json({
            success: true,
            data: catalogue
        });
        
    } catch (error) {
        console.error('Catalogue API error:', {
            message: error.message,
            stack: error.stack,
            country: req.query.country
        });
        
        // Если это ошибка парсинга JSON, даем понятное сообщение
        if (error.message.includes('JSON') || error.message.includes('Unexpected token')) {
            return res.status(500).json({
                success: false,
                error: 'Invalid response format from eSIM Go API',
                message: 'The API returned a non-JSON response. This might indicate: ' +
                         '1) API endpoint error, 2) Authentication issue, 3) Server error on eSIM Go side.',
                suggestion: 'Check the API endpoint URL and your API key. ' +
                           'The /catalogue endpoint should return JSON with { bundles: [], pageCount, pageSize, rows }',
                errorDetails: error.message
            });
        }
        
        // Если это ошибка 404, даем более понятное сообщение
        if (error.message.includes('Not Found') || error.message.includes('404')) {
            return res.status(404).json({
                success: false,
                error: 'Catalogue endpoint not found',
                message: 'The /catalogue endpoint does not exist in eSIM Go API v2.4. ' +
                         'Please check the API documentation or contact support.',
                suggestion: 'Verify that you are using the correct API version (v2.4) and that your API key has access to the catalogue endpoint.',
                documentation: 'https://docs.esim-go.com/api/v2_4/',
                portal: 'https://portal.esim-go.com/'
            });
        }
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch catalogue',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

