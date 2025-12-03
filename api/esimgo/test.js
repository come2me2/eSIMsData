/**
 * Тестовый endpoint для диагностики подключения к eSIM Go API
 * Endpoint: GET /api/esimgo/test
 */

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const apiKey = process.env.ESIMGO_API_KEY;
        const apiUrl = process.env.ESIMGO_API_URL || 'https://api.esim-go.com/v2';
        
        // Проверяем наличие API ключа
        if (!apiKey) {
            return res.status(200).json({
                success: false,
                error: 'ESIMGO_API_KEY не установлен',
                hasApiKey: false,
                apiUrl: apiUrl
            });
        }
        
        // Проверяем доступность fetch
        const hasFetch = typeof fetch !== 'undefined';
        
        // Пробуем сделать простой запрос
        let testResult = null;
        let testError = null;
        
        if (hasFetch) {
            try {
                const testUrl = `${apiUrl}/catalogue?country=TH`;
                console.log('Testing connection to:', testUrl);
                
                const response = await fetch(testUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': apiKey
                    }
                });
                
                testResult = {
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok,
                    headers: Object.fromEntries(response.headers.entries())
                };
                
                if (response.ok) {
                    const data = await response.json();
                    testResult.dataReceived = true;
                    testResult.dataKeys = Object.keys(data || {});
                } else {
                    const text = await response.text();
                    testResult.errorText = text;
                }
            } catch (error) {
                testError = {
                    message: error.message,
                    stack: error.stack
                };
            }
        }
        
        return res.status(200).json({
            success: true,
            diagnostics: {
                hasApiKey: !!apiKey,
                apiKeyLength: apiKey ? apiKey.length : 0,
                apiKeyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : null,
                apiUrl: apiUrl,
                hasFetch: hasFetch,
                nodeVersion: process.version,
                testResult: testResult,
                testError: testError
            }
        });
        
    } catch (error) {
        console.error('Test endpoint error:', error);
        
        return res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
};

