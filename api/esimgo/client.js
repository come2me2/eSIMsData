/**
 * eSIM Go API Client
 * Документация: https://docs.esim-go.com/
 * API v2.0: https://docs.esim-go.com/api/v2_0/
 */

const esimgoConfig = {
    apiKey: process.env.ESIMGO_API_KEY,
    apiUrl: process.env.ESIMGO_API_URL || 'https://api.esim-go.com/v2',
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
        // В Node.js 18+ fetch доступен глобально
        // Для Vercel Serverless Functions это работает из коробки
        const response = await fetch(url, config);
        
        // Проверяем статус ответа
        if (!response.ok) {
            let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
            
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
                // Если не удалось распарсить JSON, используем текст
                const text = await response.text().catch(() => '');
                if (text) errorMessage = text;
            }
            
            throw new Error(errorMessage);
        }
        
        return await response.json();
    } catch (error) {
        console.error('eSIM Go API Error:', {
            endpoint,
            method: options.method || 'GET',
            error: error.message
        });
        throw error;
    }
}

/**
 * Получить каталог доступных пакетов данных
 * @param {string} countryCode - Код страны (ISO 3166-1 alpha-2, опционально)
 * @returns {Promise<Object>} Каталог продуктов
 * Документация: https://docs.esim-go.com/api/v2_0/#tag/Catalogue
 */
async function getCatalogue(countryCode = null) {
    const endpoint = countryCode 
        ? `/catalogue?country=${countryCode}`
        : '/catalogue';
    return makeRequest(endpoint);
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

