/**
 * eSIM Go API Client
 * Документация: https://docs.esim-go.com/
 * API v2.0: https://docs.esim-go.com/api/v2_0/
 */

const esimgoConfig = {
    apiKey: process.env.ESIMGO_API_KEY,
    // Используем версию 2.4 согласно документации
    apiUrl: process.env.ESIMGO_API_URL || 'https://api.esim-go.com/v2.4',
    timeout: 30000
};

if (!esimgoConfig.apiKey) {
    console.warn('⚠️ ESIMGO_API_KEY не установлен. Установите переменную окружения в Vercel.');
}

/**
 * Базовый метод для выполнения запросов к eSIM Go API
 * Документация: https://docs.esim-go.com/api/v2_0/
 * 
 * Использует встроенный fetch (Node.js 18+) или node-fetch для старых версий
 */
async function makeRequest(endpoint, options = {}) {
    // Проверка наличия API ключа
    if (!esimgoConfig.apiKey) {
        throw new Error('ESIMGO_API_KEY не установлен. Установите переменную окружения в Vercel.');
    }
    
    const url = `${esimgoConfig.apiUrl}${endpoint}`;
    
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'X-API-Key': esimgoConfig.apiKey, // Аутентификация через заголовок
    };
    
    const config = {
        method: options.method || 'GET',
        headers: {
            ...defaultHeaders,
            ...options.headers
        },
        ...options
    };
    
    if (options.body) {
        config.body = JSON.stringify(options.body);
    }
    
    try {
        console.log('Making request to eSIM Go:', {
            url,
            method: config.method,
            hasApiKey: !!esimgoConfig.apiKey
        });
        
        // В Node.js 18+ fetch доступен глобально
        // Для Vercel Serverless Functions это работает из коробки
        // Если fetch недоступен, используем node-fetch
        let fetchFunction = fetch;
        
        if (typeof fetch === 'undefined') {
            // Fallback для старых версий Node.js
            try {
                fetchFunction = require('node-fetch');
            } catch (e) {
                throw new Error('fetch is not available and node-fetch is not installed');
            }
        }
        
        const response = await fetchFunction(url, config);
        
        console.log('eSIM Go API response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
        });
        
        // Проверяем статус ответа
        if (!response.ok) {
            let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
            
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorData.detail || errorMessage;
                console.error('eSIM Go API error response:', errorData);
            } catch {
                // Если не удалось распарсить JSON, используем текст
                const text = await response.text().catch(() => '');
                if (text) {
                    errorMessage = text;
                    console.error('eSIM Go API error text:', text);
                }
            }
            
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('eSIM Go API success:', {
            endpoint,
            hasData: !!data
        });
        
        return data;
    } catch (error) {
        console.error('eSIM Go API Error:', {
            endpoint,
            url,
            method: options.method || 'GET',
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Получить каталог доступных пакетов данных
 * @param {string} countryCode - Код страны (ISO 3166-1 alpha-2, опционально)
 * @returns {Promise<Object>} Каталог продуктов
 * Документация: https://docs.esim-go.com/api/v2_4/
 * 
 * Примечание: В API eSIM Go может не быть прямого endpoint /catalogue
 * Возможно, нужно использовать /bundles или другой endpoint
 */
async function getCatalogue(countryCode = null) {
    // Пробуем разные варианты endpoints
    // Вариант 1: /bundles (если такой endpoint существует)
    // Вариант 2: /catalogue (классический вариант)
    // Вариант 3: /products (альтернативное название)
    
    let endpoint = '/bundles'; // Пробуем сначала bundles
    
    if (countryCode) {
        const params = new URLSearchParams({ country: countryCode.toUpperCase() });
        endpoint = `${endpoint}?${params.toString()}`;
    }
    
    try {
        return await makeRequest(endpoint);
    } catch (error) {
        // Если /bundles не работает, пробуем /catalogue
        if (error.message.includes('Not Found') || error.message.includes('404')) {
            console.log('Trying /catalogue endpoint instead of /bundles');
            endpoint = '/catalogue';
            if (countryCode) {
                const params = new URLSearchParams({ country: countryCode.toUpperCase() });
                endpoint = `${endpoint}?${params.toString()}`;
            }
            return await makeRequest(endpoint);
        }
        throw error;
    }
}

/**
 * Создать заказ eSIM
 * @param {Object} orderData - Данные заказа
 * @param {string} orderData.type - Тип транзакции: "transaction" для заказа пакета данных
 * @param {string} orderData.bundle_id - ID пакета из каталога
 * @param {string} orderData.iccid - ICCID eSIM (если уже есть eSIM)
 * @returns {Promise<Object>} Информация о заказе
 * Документация: https://docs.esim-go.com/api/v2_0/#tag/Orders
 */
async function createOrder(orderData) {
    // Структура заказа согласно документации
    const order = {
        type: 'transaction', // Тип транзакции для заказа пакета данных
        ...orderData
    };
    
    return makeRequest('/orders', {
        method: 'POST',
        body: order
    });
}

/**
 * Получить статус заказа
 * @param {string} orderId - ID заказа в eSIM Go
 * @returns {Promise<Object>} Статус заказа
 * Документация: https://docs.esim-go.com/api/v2_0/#tag/Orders
 */
async function getOrderStatus(orderId) {
    return makeRequest(`/orders/${orderId}`);
}

/**
 * Получить информацию о eSIM
 * @param {string} iccid - ICCID eSIM
 * @returns {Promise<Object>} Информация о eSIM
 * Документация: https://docs.esim-go.com/api/v2_0/#tag/eSIMs
 */
async function getESIMInfo(iccid) {
    return makeRequest(`/esims/${iccid}`);
}

/**
 * Получить пакеты данных для eSIM
 * @param {string} iccid - ICCID eSIM
 * @returns {Promise<Object>} Список пакетов данных
 * Документация: https://docs.esim-go.com/api/v2_0/#tag/eSIMs
 */
async function getESIMBundles(iccid) {
    return makeRequest(`/esims/${iccid}/bundles`);
}

/**
 * Создать новый eSIM профиль
 * @param {Object} esimData - Данные для создания eSIM
 * @returns {Promise<Object>} Информация о созданном eSIM (ICCID, QR код)
 * Документация: https://docs.esim-go.com/api/v2_0/#tag/eSIMs
 */
async function createESIM(esimData = {}) {
    return makeRequest('/esims', {
        method: 'POST',
        body: esimData
    });
}

module.exports = {
    getCatalogue,
    createOrder,
    getOrderStatus,
    getESIMInfo,
    getESIMBundles,
    createESIM
};

