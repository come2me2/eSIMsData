/**
 * Debug endpoint для проверки сырого ответа от eSIM Go API
 * Endpoint: GET /api/esimgo/debug
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
        const { endpoint = 'esims', country } = req.query;
        
        console.log('Debug request for endpoint:', endpoint, 'country:', country);
        
        // Формируем endpoint с параметрами если нужно
        let endpointPath = `/${endpoint}`;
        if (country && endpoint !== 'esims') {
            endpointPath += `?country=${country.toUpperCase()}`;
        }
        
        // Получаем сырой ответ от API
        const rawResponse = await esimgoClient.makeRequest(endpointPath);
        
        // Анализируем структуру
        const analysis = {
            endpoint: `/${endpoint}`,
            responseType: typeof rawResponse,
            isArray: Array.isArray(rawResponse),
            keys: rawResponse ? Object.keys(rawResponse) : [],
            hasEsims: !!rawResponse?.esims,
            esimsType: typeof rawResponse?.esims,
            esimsIsArray: Array.isArray(rawResponse?.esims),
            esimsLength: rawResponse?.esims?.length || 0,
            sampleEsim: rawResponse?.esims?.[0] || null,
            fullResponse: rawResponse
        };
        
        return res.status(200).json({
            success: true,
            analysis: analysis,
            rawData: rawResponse
        });
        
    } catch (error) {
        console.error('Debug API error:', error);
        
        // Если это access denied, возвращаем 403
        const statusCode = error.message.includes('Access denied') || error.message.includes('access denied') 
            ? 403 
            : 500;
        
        return res.status(statusCode).json({
            success: false,
            error: error.message,
            suggestion: error.message.includes('Access denied') 
                ? 'This endpoint may not be available for your API key or requires different permissions. ' +
                  'Try checking the eSIM Go API documentation or contact support to find the correct endpoint for getting available bundles/catalogue.'
                : undefined,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

