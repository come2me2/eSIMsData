/**
 * Admin Panel Statistics API
 * Endpoint: GET /api/admin/stats
 * 
 * Возвращает статистику продаж для Dashboard
 */

const ordersHandler = require('../orders');

// Загрузить все заказы
async function getAllOrders() {
    const fs = require('fs').promises;
    const path = require('path');
    const ORDERS_FILE = path.join(__dirname, '..', '..', 'data', 'orders.json');
    
    try {
        const data = await fs.readFile(ORDERS_FILE, 'utf8');
        const orders = JSON.parse(data);
        
        // Преобразуем объект в массив всех заказов
        const allOrders = [];
        for (const userId in orders) {
            if (Array.isArray(orders[userId])) {
                allOrders.push(...orders[userId]);
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

// Вычислить статистику
function calculateStats(orders) {
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Все заказы
    const allOrders = orders.filter(o => o.status === 'completed' || o.status === 'active');
    
    // Заказы за последний месяц
    const recentOrders = allOrders.filter(o => {
        const orderDate = new Date(o.createdAt || o.date || 0);
        return orderDate >= oneMonthAgo;
    });
    
    // Заказы за предыдущий месяц (для сравнения)
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const previousMonthOrders = allOrders.filter(o => {
        const orderDate = new Date(o.createdAt || o.date || 0);
        return orderDate >= twoMonthsAgo && orderDate < oneMonthAgo;
    });
    
    // Общая выручка
    const totalRevenue = allOrders.reduce((sum, order) => {
        const price = parseFloat(order.price) || 0;
        return sum + price;
    }, 0);
    
    // Выручка за последний месяц
    const recentRevenue = recentOrders.reduce((sum, order) => {
        const price = parseFloat(order.price) || 0;
        return sum + price;
    }, 0);
    
    // Выручка за предыдущий месяц
    const previousRevenue = previousMonthOrders.reduce((sum, order) => {
        const price = parseFloat(order.price) || 0;
        return sum + price;
    }, 0);
    
    // Изменение выручки в процентах
    const revenueChange = previousRevenue > 0 
        ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;
    
    // Уникальные пользователи
    const uniqueUsers = new Set(allOrders.map(o => o.telegram_user_id).filter(Boolean));
    const recentUniqueUsers = new Set(recentOrders.map(o => o.telegram_user_id).filter(Boolean));
    const previousUniqueUsers = new Set(previousMonthOrders.map(o => o.telegram_user_id).filter(Boolean));
    
    // Конверсия (упрощенная: заказы / уникальные пользователи)
    const conversionRate = uniqueUsers.size > 0 
        ? (allOrders.length / uniqueUsers.size) * 100 
        : 0;
    
    const previousConversionRate = previousUniqueUsers.size > 0
        ? (previousMonthOrders.length / previousUniqueUsers.size) * 100
        : 0;
    
    const conversionChange = previousConversionRate > 0
        ? conversionRate - previousConversionRate
        : 0;
    
    return {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        revenueChange: Math.round(revenueChange * 100) / 100,
        totalOrders: allOrders.length,
        ordersChange: recentOrders.length - previousMonthOrders.length,
        activeUsers: uniqueUsers.size,
        usersChange: recentUniqueUsers.size - previousUniqueUsers.size,
        conversionRate: Math.round(conversionRate * 100) / 100,
        conversionChange: Math.round(conversionChange * 100) / 100
    };
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }
    
    try {
        // Проверка аутентификации (через middleware)
        const auth = require('./auth');
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
        
        // Загружаем все заказы
        const orders = await getAllOrders();
        
        // Вычисляем статистику
        const stats = calculateStats(orders);
        
        return res.status(200).json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        console.error('Error getting stats:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to get statistics'
        });
    }
};

