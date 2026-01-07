/**
 * Admin Panel Orders API
 * Endpoint: GET /api/admin/orders - список всех заказов
 * Endpoint: GET /api/admin/orders/:id - детали заказа
 * Endpoint: PUT /api/admin/orders/:id/status - изменение статуса заказа
 */

const fs = require('fs').promises;
const path = require('path');
const auth = require('./auth');

const ORDERS_FILE = path.join(__dirname, '..', '..', 'data', 'orders.json');

// Загрузить все заказы
async function getAllOrders() {
    try {
        // Проверяем существование файла
        try {
            await fs.access(ORDERS_FILE);
        } catch (accessError) {
            if (accessError.code === 'ENOENT') {
                console.log('Orders file does not exist, creating empty structure');
                // Создаем пустую структуру
                const dataDir = path.dirname(ORDERS_FILE);
                await fs.mkdir(dataDir, { recursive: true });
                await fs.writeFile(ORDERS_FILE, '{}', 'utf8');
                return [];
            }
            throw accessError;
        }
        
        const data = await fs.readFile(ORDERS_FILE, 'utf8');
        
        // Проверяем, что файл не пустой
        if (!data || data.trim() === '') {
            console.log('Orders file is empty');
            return [];
        }
        
        const orders = JSON.parse(data);
        
        // Преобразуем объект в массив всех заказов с userId
        const allOrders = [];
        for (const userId in orders) {
            if (Array.isArray(orders[userId])) {
                orders[userId].forEach(order => {
                    allOrders.push({
                        ...order,
                        telegram_user_id: userId
                    });
                });
            }
        }
        
        return allOrders;
    } catch (error) {
        console.error('Error loading orders:', error);
        // Возвращаем пустой массив вместо ошибки, чтобы не ломать API
        return [];
    }
}

// Сохранить все заказы
async function saveAllOrders(ordersArray) {
    // Преобразуем массив обратно в объект по userId
    const ordersObj = {};
    
    ordersArray.forEach(order => {
        const userId = order.telegram_user_id;
        if (!ordersObj[userId]) {
            ordersObj[userId] = [];
        }
        
        // Удаляем userId из объекта заказа перед сохранением
        const { telegram_user_id, ...orderData } = order;
        ordersObj[userId].push(orderData);
    });
    
    const dataDir = path.dirname(ORDERS_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(ORDERS_FILE, JSON.stringify(ordersObj, null, 2), 'utf8');
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Проверка аутентификации
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized'
        });
    }
    
    const token = authHeader.substring(7);
    const payload = auth.verifyToken(token);
    
    if (!payload) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
    
    try {
        // Используем req.originalUrl для определения относительного пути
        // req.path может быть перезаписан Express, поэтому используем originalUrl
        const originalUrl = req.originalUrl || req.url || '';
        const urlWithoutQuery = originalUrl.split('?')[0];
        
        // Убираем префикс /api/admin/orders из пути
        const relativePath = urlWithoutQuery.replace('/api/admin/orders', '') || '';
        console.log(`[Admin Orders API] Request: ${req.method} ${originalUrl}`);
        console.log(`[Admin Orders API] Relative path: "${relativePath}"`);
        console.log(`[Admin Orders API] Query params:`, req.query);
        
        // Парсим относительный путь - убираем ведущий слеш
        const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
        const urlParts = cleanPath.split('/').filter(Boolean);
        console.log(`[Admin Orders API] URL parts:`, urlParts);
        
        // Определяем orderId - только если есть хотя бы один элемент пути
        // Пустой путь означает список всех заказов
        const isStatusUpdate = urlParts.length > 1 && urlParts[urlParts.length - 1] === 'status';
        const isResend = urlParts.length > 1 && urlParts[urlParts.length - 1] === 'resend';
        const orderId = (isStatusUpdate || isResend) ? urlParts[0] : (urlParts.length > 0 ? urlParts[urlParts.length - 1] : null);
        
        console.log(`[Admin Orders API] orderId: ${orderId}, isStatusUpdate: ${isStatusUpdate}, isResend: ${isResend}, urlParts.length: ${urlParts.length}`);
        
        // GET /api/admin/orders - список всех заказов (путь пустой)
        // Проверяем, что путь действительно пустой (нет orderId)
        if (req.method === 'GET' && (!orderId || orderId === '' || urlParts.length === 0)) {
            try {
                const { limit, offset, sort = 'createdAt', order = 'desc', status, userId, paymentType, search, dateFrom, dateTo } = req.query;
                
                console.log(`[Admin Orders API] Loading orders from: ${ORDERS_FILE}`);
            let orders = await getAllOrders();
                
                console.log(`[Admin Orders API] Loaded ${orders.length} orders from file`);
            
            // Фильтрация по статусу
            if (status) {
                orders = orders.filter(o => o.status === status);
            }
            
            // Фильтрация по пользователю
            if (userId) {
                orders = orders.filter(o => o.telegram_user_id === userId);
            }
            
            // Фильтрация по способу оплаты
            if (paymentType) {
                orders = orders.filter(o => {
                    const orderPaymentType = o.payment_method || o.paymentType;
                    return orderPaymentType === paymentType;
                });
            }
            
            // Поиск по ID заказа или Telegram ID
            if (search) {
                const searchLower = search.toLowerCase();
                orders = orders.filter(o => {
                    const orderId = (o.orderReference || o.id || '').toString().toLowerCase();
                    const userId = (o.telegram_user_id || '').toString().toLowerCase();
                    const username = (o.telegram_username || '').toLowerCase();
                    return orderId.includes(searchLower) || userId.includes(searchLower) || username.includes(searchLower);
                });
            }
            
            // Фильтрация по дате
            if (dateFrom) {
                const fromDate = new Date(dateFrom);
                orders = orders.filter(o => {
                    const orderDate = new Date(o.createdAt || o.date || 0);
                    return orderDate >= fromDate;
                });
            }
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999); // Конец дня
                orders = orders.filter(o => {
                    const orderDate = new Date(o.createdAt || o.date || 0);
                    return orderDate <= toDate;
                });
            }
            
            // Сортировка
            orders.sort((a, b) => {
                const aVal = a[sort] || '';
                const bVal = b[sort] || '';
                
                if (order === 'desc') {
                    return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
                } else {
                    return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                }
            });
            
            // Пагинация
            const total = orders.length;
            const limitNum = limit ? parseInt(limit) : undefined;
            const offsetNum = offset ? parseInt(offset) : 0;
            
            if (limitNum) {
                orders = orders.slice(offsetNum, offsetNum + limitNum);
            }
            
                console.log(`[Admin Orders API] Returning ${orders.length} orders (filtered from ${total} total)`);
            
            return res.status(200).json({
                success: true,
                orders,
                total,
                limit: limitNum,
                offset: offsetNum
                });
            } catch (error) {
                console.error('[Admin Orders API] Error in GET /api/admin/orders:', error);
                return res.status(500).json({
                    success: false,
                    error: error.message || 'Failed to load orders',
                    orders: [],
                    total: 0
                });
            }
        }
        
        // GET /api/admin/orders/:id - детали заказа
        if (req.method === 'GET' && orderId) {
            console.log(`[Admin Orders API] Looking for order with ID: ${orderId}`);
            const allOrders = await getAllOrders();
            console.log(`[Admin Orders API] Total orders in database: ${allOrders.length}`);
            
            // Пробуем разные варианты поиска
            let order = allOrders.find(o => {
                // Вариант 1: полный ID (userId_orderReference)
                if (o.telegram_user_id && o.orderReference) {
                    const fullId = `${o.telegram_user_id}_${o.orderReference}`;
                    if (fullId === orderId) {
                        console.log(`[Admin Orders API] Found by fullId: ${fullId}`);
                        return true;
                    }
                }
                // Вариант 2: только orderReference
                if (o.orderReference === orderId) {
                    console.log(`[Admin Orders API] Found by orderReference: ${o.orderReference}`);
                    return true;
                }
                // Вариант 3: только id
                if (o.id === orderId) {
                    console.log(`[Admin Orders API] Found by id: ${o.id}`);
                    return true;
                }
                return false;
            });
            
            if (!order) {
                console.log(`[Admin Orders API] Order not found. Searched ID: ${orderId}`);
                console.log(`[Admin Orders API] Available order IDs:`, allOrders.slice(0, 5).map(o => 
                    o.telegram_user_id && o.orderReference ? `${o.telegram_user_id}_${o.orderReference}` : o.orderReference || o.id
                ));
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }
            
            console.log(`[Admin Orders API] Order found: ${order.orderReference || order.id}`);
            return res.status(200).json({
                success: true,
                order
            });
        }
        
        // PUT /api/admin/orders/:id/status - изменение статуса
        if (req.method === 'PUT' && isStatusUpdate && orderId) {
            const { status } = req.body || {};
            
            if (!status) {
                return res.status(400).json({
                    success: false,
                    error: 'Status is required'
                });
            }
            
            const allOrders = await getAllOrders();
            const orderIndex = allOrders.findIndex(o => 
                o.orderReference === orderId || 
                o.id === orderId ||
                o.telegram_user_id + '_' + o.orderReference === orderId ||
                (o.telegram_user_id && o.orderReference && `${o.telegram_user_id}_${o.orderReference}` === orderId)
            );
            
            if (orderIndex === -1) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }
            
            // Обновляем статус
            allOrders[orderIndex].status = status;
            allOrders[orderIndex].updatedAt = new Date().toISOString();
            
            // Сохраняем
            await saveAllOrders(allOrders);
            
            return res.status(200).json({
                success: true,
                order: allOrders[orderIndex]
            });
        }
        
        // POST /api/admin/orders/:id/resend - повторная отправка eSIM в Telegram
        if (req.method === 'POST' && isResend) {
            const orderIdParam = urlParts.length > 1 ? urlParts[urlParts.length - 2] : null;
            
            if (!orderIdParam) {
                return res.status(400).json({
                    success: false,
                    error: 'Order ID is required'
                });
            }
            
            const allOrders = await getAllOrders();
            const order = allOrders.find(o => 
                o.orderReference === orderIdParam || 
                o.id === orderIdParam ||
                o.telegram_user_id + '_' + o.orderReference === orderIdParam ||
                (o.telegram_user_id && o.orderReference && `${o.telegram_user_id}_${o.orderReference}` === orderIdParam)
            );
            
            if (!order) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }
            
            if (!order.telegram_user_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Telegram user ID not found in order'
                });
            }
            
            // Получаем eSIM данные
            const iccid = order.iccid || order.assignments?.iccid || order.esimData?.iccid;
            const matchingId = order.matchingId || order.assignments?.matchingId || order.esimData?.matchingId;
            const rspUrl = order.rspUrl || order.smdpAddress || order.assignments?.smdpAddress || order.esimData?.smdpAddress;
            const qrCode = order.qrCode || order.assignments?.qrCode || order.esimData?.qrCode || order.qr_code;
            
            if (!iccid && !matchingId) {
                return res.status(400).json({
                    success: false,
                    error: 'eSIM data not found in order'
                });
            }
            
            // Отправляем сообщение в Telegram
            try {
                const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
                if (!botToken) {
                    return res.status(500).json({
                        success: false,
                        error: 'TELEGRAM_BOT_TOKEN not configured'
                    });
                }
                
                // Формируем сообщение с данными eSIM
                let message = `📱 Ваши данные eSIM:\n\n`;
                if (iccid) message += `ICCID: \`${iccid}\`\n`;
                if (matchingId) message += `Matching ID: \`${matchingId}\`\n`;
                if (rspUrl) message += `RSP URL: \`${rspUrl}\`\n`;
                
                if (qrCode) {
                    message += `\nQR код:`;
                }
                
                // Отправляем текстовое сообщение
                const textResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: order.telegram_user_id,
                        text: message,
                        parse_mode: 'Markdown'
                    })
                });
                
                const textData = await textResponse.json();
                
                // Если есть QR код, отправляем фото
                if (qrCode && textData.ok) {
                    const photoResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: order.telegram_user_id,
                            photo: qrCode,
                            caption: 'QR код для активации eSIM'
                        })
                    });
                    
                    const photoData = await photoResponse.json();
                    
                    if (!photoData.ok) {
                        console.warn('Failed to send QR code photo:', photoData);
                    }
                }
                
                if (!textData.ok) {
                    return res.status(500).json({
                        success: false,
                        error: textData.description || 'Failed to send message to Telegram'
                    });
                }
            
            return res.status(200).json({
                success: true,
                    message: 'eSIM data sent to user'
                });
                
            } catch (error) {
                console.error('Error sending eSIM to Telegram:', error);
                return res.status(500).json({
                    success: false,
                    error: error.message || 'Failed to send eSIM data'
                });
            }
        }
        
        // POST /api/admin/orders/add-from-esimgo - добавление заказа из eSIMgo по orderReference
        if (req.method === 'POST' && urlParts.length > 0 && urlParts[0] === 'add-from-esimgo') {
            const { orderReference, telegram_user_id } = req.body || {};
            
            if (!orderReference) {
                return res.status(400).json({
                    success: false,
                    error: 'orderReference is required'
                });
            }
            
            if (!telegram_user_id) {
                return res.status(400).json({
                    success: false,
                    error: 'telegram_user_id is required'
                });
            }
            
            try {
                const esimgoClient = require('../_lib/esimgo/client');
                
                // Получаем полный статус заказа из eSIMgo
                console.log(`[Admin Orders] Fetching order ${orderReference} from eSIMgo...`);
                const orderData = await esimgoClient.getOrderStatus(orderReference);
                
                // Получаем assignments
                let assignments = null;
                if (orderData.status === 'completed') {
                    try {
                        assignments = await esimgoClient.getESIMAssignments(orderReference);
                    } catch (assignError) {
                        console.warn('Failed to get assignments:', assignError.message);
                    }
                }
                
                // Извлекаем данные
                const bundleName = orderData.order?.[0]?.item || null;
                const esimData = orderData.order?.[0]?.esims?.[0] || null;
                
                // Формируем данные для сохранения
                const orderToSave = {
                    telegram_user_id: telegram_user_id,
                    orderReference: orderReference,
                    iccid: assignments?.iccid || esimData?.iccid || null,
                    matchingId: assignments?.matchingId || null,
                    smdpAddress: assignments?.smdpAddress || null,
                    country_code: null,
                    country_name: null,
                    plan_id: null,
                    plan_type: null,
                    bundle_name: bundleName,
                    price: orderData.total || null,
                    currency: orderData.currency || 'USD',
                    status: orderData.status || 'completed',
                    createdAt: orderData.date || orderData.createdAt || new Date().toISOString(),
                    source: 'telegram_mini_app',
                    customer: telegram_user_id,
                    provider_product_id: bundleName || null,
                    provider_base_price_usd: orderData.basePrice || null,
                    payment_method: 'telegram_stars'
                };
                
                // Сохраняем через API orders
                const ordersHandler = require('../orders');
                const saveReq = createMockReq(orderToSave);
                const saveRes = createMockRes();
                
                await ordersHandler(saveReq, saveRes);
                
                if (saveRes.statusCode === 200) {
                    return res.status(200).json({
                        success: true,
                        message: 'Order added successfully',
                        order: saveRes.data?.data || orderToSave
                    });
                } else {
                    return res.status(500).json({
                        success: false,
                        error: saveRes.data?.error || 'Failed to save order'
                    });
                }
                
            } catch (error) {
                console.error('Error adding order from eSIMgo:', error);
                return res.status(500).json({
                    success: false,
                    error: error.message || 'Failed to add order from eSIMgo'
                });
            }
        }
        
        // Helper functions для mock request/response
        function createMockReq(body = {}) {
            return {
                method: 'POST',
                body,
                headers: {},
                query: {}
            };
        }
        
        function createMockRes() {
            let statusCode = 200;
            let responseData = null;
            
            return {
                status: (code) => {
                    statusCode = code;
                    return {
                        json: (data) => {
                            responseData = data;
                        }
                    };
                },
                setHeader: () => {},
                get statusCode() { return statusCode; },
                get data() { return responseData; }
            };
        }
        
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
        
    } catch (error) {
        console.error('Error in admin orders API:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
};

