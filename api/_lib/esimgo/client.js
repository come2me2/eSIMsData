/**
 * eSIM Go API Client
 * Документация: https://docs.esim-go.com/
 * API v2.4: https://api.esim-go.com/v2.4
 * OpenAPI Schema: esim_go_schema_v2_4.yaml
 */

const esimgoConfig = {
    apiKey: process.env.ESIMGO_API_KEY,
    // Используем версию v2.4 - последняя версия API
    // Можно переопределить через переменную окружения ESIMGO_API_URL
    apiUrl: process.env.ESIMGO_API_URL || 'https://api.esim-go.com/v2.4',
    timeout: 30000
};

if (!esimgoConfig.apiKey) {
    console.warn('⚠️ ESIMGO_API_KEY не установлен. Установите переменную окружения в Vercel.');
}

/**
 * Базовый метод для выполнения запросов к eSIM Go API
 * Документация: https://docs.esim-go.com/api/v2_4/
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
                
                // Специальная обработка для "access denied"
                if (errorMessage.toLowerCase().includes('access denied') || 
                    errorMessage.toLowerCase().includes('forbidden') ||
                    response.status === 403) {
                    throw new Error(`Access denied: This endpoint may require different permissions or is not available for your API key. Endpoint: ${endpoint}`);
                }
            } catch (jsonError) {
                // Если это уже наша ошибка access denied, пробрасываем дальше
                if (jsonError.message.includes('Access denied')) {
                    throw jsonError;
                }
                // Если не удалось распарсить JSON, используем текст
                const text = await response.text().catch(() => '');
                if (text) {
                    errorMessage = text;
                    console.error('eSIM Go API error text:', text);
                }
            }
            
            throw new Error(errorMessage);
        }
        
        // Проверяем Content-Type перед парсингом
        const contentType = response.headers.get('content-type') || '';
        
        // Читаем текст ответа один раз (response.text() можно вызвать только один раз)
        const textContent = await response.text();
        let data;
        
        // Определяем формат по Content-Type и содержимому
        const isCSV = contentType.includes('text/csv') || 
                     endpoint.includes('/assignments') ||
                     (textContent.trim().startsWith('ICCID') && textContent.includes(','));
        
        if (isCSV) {
            // Парсим CSV ответ для assignments
            const lines = textContent.trim().split('\n');
            if (lines.length < 2) {
                throw new Error('Invalid CSV response: not enough lines');
            }
            
            // Парсим заголовки
            const headers = lines[0].split(',').map(h => h.trim());
            const dataLine = lines[1].split(',').map(d => d.trim());
            
            // Создаем объект из CSV
            const csvData = {};
            headers.forEach((header, index) => {
                const value = dataLine[index] || '';
                // Преобразуем названия колонок в camelCase
                if (header === 'ICCID') csvData.iccid = value;
                else if (header === 'Matching ID') csvData.matchingId = value;
                else if (header === 'RSP URL') csvData.smdpAddress = value;
                else if (header === 'Bundle') csvData.bundle = value;
                else if (header === 'Reference') csvData.reference = value;
                else csvData[header.toLowerCase().replace(/\s+/g, '')] = value;
            });
            
            console.log('✅ CSV assignments parsed:', {
                hasIccid: !!csvData.iccid,
                hasMatchingId: !!csvData.matchingId,
                hasSmdpAddress: !!csvData.smdpAddress
            });
            
            data = csvData;
        } else if (contentType.includes('application/json') || textContent.trim().startsWith('{') || textContent.trim().startsWith('[')) {
            // Парсим JSON ответ
            try {
                data = JSON.parse(textContent);
            } catch (jsonError) {
                console.error('Failed to parse JSON response:', {
                    endpoint,
                    contentType,
                    textPreview: textContent.substring(0, 200)
                });
                throw new Error(`Invalid JSON response: ${textContent.substring(0, 100)}`);
            }
        } else {
            // Если ответ не JSON и не CSV, выбрасываем ошибку
            console.error('Non-JSON/CSV response:', {
                endpoint,
                contentType,
                textPreview: textContent.substring(0, 200)
            });
            throw new Error(`Expected JSON or CSV but got ${contentType}: ${textContent.substring(0, 100)}`);
        }
        
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
 * Получить список eSIM
 * @param {Object} options - Опции запроса
 * @param {number} options.page - Номер страницы (опционально)
 * @param {number} options.pageSize - Размер страницы (опционально)
 * @returns {Promise<Object>} Список eSIM с пагинацией
 * Документация: https://docs.esim-go.com/api/v2_4/
 */
async function getESIMs(options = {}) {
    let endpoint = '/esims';
    const params = new URLSearchParams();
    
    if (options.page) {
        params.append('page', options.page);
    }
    if (options.pageSize) {
        params.append('pageSize', options.pageSize);
    }
    
    if (params.toString()) {
        endpoint = `${endpoint}?${params.toString()}`;
    }
    
    return makeRequest(endpoint);
}

/**
 * Получить каталог доступных пакетов данных (Bundle)
 * @param {string|string[]} countryCode - Код страны или массив кодов (ISO 3166-1 alpha-2, опционально)
 * @param {Object} options - Дополнительные опции
 * @param {number} options.page - Номер страницы
 * @param {number} options.perPage - Количество элементов на странице
 * @param {string} options.region - Регион для фильтрации
 * @param {string} options.group - Группа Bundle для фильтрации
 * @returns {Promise<Object>} Каталог продуктов (Bundle)
 * Документация: https://docs.esim-go.com/api/v2_4/#tag/Catalogue
 * 
 * Использует endpoint /catalogue для получения каталога Bundle
 */
async function getCatalogue(countryCode = null, options = {}) {
    // Используем /catalogue endpoint согласно API v2.4
    const params = new URLSearchParams();
    
    // Параметр countries (может быть строка или массив)
    if (countryCode) {
        if (Array.isArray(countryCode)) {
            params.append('countries', countryCode.join(','));
        } else {
            params.append('countries', countryCode.toUpperCase());
        }
    }
    
    // Дополнительные параметры
    if (options.page) {
        params.append('page', options.page.toString());
    }
    if (options.perPage) {
        params.append('perPage', options.perPage.toString());
    }
    if (options.region) {
        params.append('region', options.region);
    }
    if (options.group) {
        params.append('group', options.group);
    }
    if (options.description) {
        params.append('description', options.description);
    }
    if (options.direction) {
        params.append('direction', options.direction);
    }
    if (options.orderBy) {
        params.append('orderBy', options.orderBy);
    }
    
    const endpoint = params.toString() 
        ? `/catalogue?${params.toString()}`
        : '/catalogue';
    
    return makeRequest(endpoint);
}

/**
 * Создать заказ eSIM
 * @param {Object} orderData - Данные заказа согласно API v2.4
 * @param {string} orderData.type - Тип: "transaction" для заказа, "validate" для проверки
 * @param {boolean} orderData.assign - Автоматически назначить bundle на eSIM
 * @param {Array} orderData.order - Массив заказов
 * @returns {Promise<Object>} Информация о заказе
 * Документация: https://docs.esim-go.com/api/v2_4/#tag/Orders
 */
async function createOrder(orderData) {
    // Структура заказа согласно API v2.4
    // orderData уже должна быть в правильном формате:
    // { type: 'transaction', assign: true, order: [{ type: 'bundle', quantity: 1, item: bundleName }] }
    return makeRequest('/orders', {
        method: 'POST',
        body: orderData
    });
}

/**
 * Получить статус заказа
 * @param {string} orderId - ID заказа в eSIM Go
 * @returns {Promise<Object>} Статус заказа
 * Документация: https://docs.esim-go.com/api/v2_4/#tag/Orders
 */
async function getOrderStatus(orderId) {
    return makeRequest(`/orders/${orderId}`);
}

/**
 * Получить информацию о eSIM
 * @param {string} iccid - ICCID eSIM
 * @returns {Promise<Object>} Информация о eSIM
 * Документация: https://docs.esim-go.com/api/v2_4/#tag/eSIMs
 */
async function getESIMInfo(iccid) {
    return makeRequest(`/esims/${iccid}`);
}

/**
 * Получить пакеты данных для eSIM
 * @param {string} iccid - ICCID eSIM
 * @returns {Promise<Object>} Список пакетов данных
 * Документация: https://docs.esim-go.com/api/v2_4/#tag/eSIMs
 */
async function getESIMBundles(iccid) {
    return makeRequest(`/esims/${iccid}/bundles`);
}

/**
 * Создать новый eSIM профиль
 * @param {Object} esimData - Данные для создания eSIM
 * @returns {Promise<Object>} Информация о созданном eSIM (ICCID, QR код)
 * Документация: https://docs.esim-go.com/api/v2_4/#tag/eSIMs
 */
async function createESIM(esimData = {}) {
    return makeRequest('/esims', {
        method: 'POST',
        body: esimData
    });
}

/**
 * Получить детали установки eSIM (QR код, SMDP+ адрес)
 * @param {string} reference - Order Reference или Apply Reference
 * @param {string} additionalFields - Дополнительные поля (например: "appleInstallUrl")
 * @returns {Promise<Object>} Детали установки eSIM
 * Документация: https://docs.esim-go.com/api/v2_4/#tag/eSIMs
 */
async function getESIMAssignments(reference, additionalFields = null) {
    const params = new URLSearchParams();
    params.append('reference', reference);
    
    if (additionalFields) {
        params.append('additionalFields', additionalFields);
    }
    
    const endpoint = `/esims/assignments?${params.toString()}`;
    return makeRequest(endpoint);
}

module.exports = {
    getCatalogue,
    getESIMs,
    createOrder,
    getOrderStatus,
    getESIMInfo,
    getESIMBundles,
    createESIM,
    getESIMAssignments,
    makeRequest // Экспортируем для использования в других модулях
};

