/**
 * eSIM Go API - Получение каталога продуктов
 * Endpoint: GET /catalogue
 * Документация: https://docs.esim-go.com/api/v2_0/#tag/Catalogue
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
        
        // Получаем каталог продуктов
        const catalogue = await esimgoClient.getCatalogue(country || null);
        
        console.log('Catalogue fetched:', {
            country: country || 'all',
            itemsCount: catalogue?.data?.length || 0,
            hasData: !!catalogue
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
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch catalogue',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

