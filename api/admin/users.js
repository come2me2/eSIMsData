/**
 * Admin Panel Users API
 * Endpoint: GET /api/admin/users - список всех пользователей
 * Endpoint: GET /api/admin/users/:id - детали пользователя
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
        
        const allOrders = [];
        for (const userId in orders) {
            if (Array.isArray(orders[userId])) {
                allOrders.push(...orders[userId].map(order => ({
                    ...order,
                    telegram_user_id: userId
                })));
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

// Получить список всех пользователей
async function getAllUsers() {
    const orders = await getAllOrders();
    
    // Группируем заказы по пользователям
    const usersMap = {};
    
    orders.forEach(order => {
        const userId = order.telegram_user_id;
        if (!userId) return;
        
        if (!usersMap[userId]) {
            usersMap[userId] = {
                telegram_user_id: userId,
                telegram_username: order.telegram_username || null,
                totalOrders: 0,
                totalSpent: 0,
                firstOrderDate: null,
                lastOrderDate: null,
                registrationDate: null, // Дата регистрации (первый заказ)
                orders: []
            };
        }
        
        usersMap[userId].totalOrders++;
        usersMap[userId].totalSpent += parseFloat(order.price) || 0;
        usersMap[userId].orders.push(order);
        
        const orderDate = new Date(order.createdAt || order.date || 0);
        if (!usersMap[userId].firstOrderDate || orderDate < usersMap[userId].firstOrderDate) {
            usersMap[userId].firstOrderDate = orderDate;
            usersMap[userId].registrationDate = orderDate; // Дата регистрации = дата первого заказа
        }
        if (!usersMap[userId].lastOrderDate || orderDate > usersMap[userId].lastOrderDate) {
            usersMap[userId].lastOrderDate = orderDate;
        }
    });
    
    return Object.values(usersMap);
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
        const userId = urlParts[urlParts.length - 1];
        
        // GET /api/admin/users - список всех пользователей
        if (req.method === 'GET' && !userId) {
            const { limit, offset, sort = 'lastOrderDate', order = 'desc' } = req.query;
            
            let users = await getAllUsers();
            
            // Сортировка
            users.sort((a, b) => {
                let aVal = a[sort];
                let bVal = b[sort];
                
                if (sort === 'lastOrderDate' || sort === 'firstOrderDate') {
                    aVal = aVal ? new Date(aVal).getTime() : 0;
                    bVal = bVal ? new Date(bVal).getTime() : 0;
                }
                
                if (order === 'desc') {
                    return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
                } else {
                    return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                }
            });
            
            // Пагинация
            const total = users.length;
            const limitNum = limit ? parseInt(limit) : undefined;
            const offsetNum = offset ? parseInt(offset) : 0;
            
            if (limitNum) {
                users = users.slice(offsetNum, offsetNum + limitNum);
            }
            
            return res.status(200).json({
                success: true,
                users,
                total,
                limit: limitNum,
                offset: offsetNum
            });
        }
        
        // GET /api/admin/users/:id - детали пользователя
        if (req.method === 'GET' && userId) {
            const users = await getAllUsers();
            const user = users.find(u => u.telegram_user_id === userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }
            
            return res.status(200).json({
                success: true,
                user
            });
        }
        
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
        
    } catch (error) {
        console.error('Error in admin users API:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
};


