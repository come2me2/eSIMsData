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
        const data = await fs.readFile(ORDERS_FILE, 'utf8');
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
        if (error.code === 'ENOENT') {
            return [];
        }
        console.error('Error loading orders:', error);
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
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
        const urlParts = req.path.split('/').filter(Boolean);
        const orderId = urlParts[urlParts.length - 1];
        const isStatusUpdate = urlParts[urlParts.length - 2] === 'status';
        
        // GET /api/admin/orders - список всех заказов
        if (req.method === 'GET' && !orderId) {
            const { limit, offset, sort = 'createdAt', order = 'desc', status, userId } = req.query;
            
            let orders = await getAllOrders();
            
            // Фильтрация по статусу
            if (status) {
                orders = orders.filter(o => o.status === status);
            }
            
            // Фильтрация по пользователю
            if (userId) {
                orders = orders.filter(o => o.telegram_user_id === userId);
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
            
            return res.status(200).json({
                success: true,
                orders,
                total,
                limit: limitNum,
                offset: offsetNum
            });
        }
        
        // GET /api/admin/orders/:id - детали заказа
        if (req.method === 'GET' && orderId) {
            const allOrders = await getAllOrders();
            const order = allOrders.find(o => 
                o.orderReference === orderId || 
                o.id === orderId ||
                o.telegram_user_id + '_' + o.orderReference === orderId ||
                (o.telegram_user_id && o.orderReference && `${o.telegram_user_id}_${o.orderReference}` === orderId)
            );
            
            if (!order) {
                return res.status(404).json({
                    success: false,
                    error: 'Order not found'
                });
            }
            
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
