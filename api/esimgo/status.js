/**
 * eSIM Go API - Проверка статуса заказа
 * Endpoint: GET /orders/:orderId
 * Документация: https://docs.esim-go.com/api/v2_4/#tag/Orders
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
        const { orderId } = req.query;
        
        if (!orderId) {
            return res.status(400).json({
                success: false,
                error: 'orderId is required'
            });
        }
        
        // Получаем статус заказа из eSIM Go
        const orderStatus = await esimgoClient.getOrderStatus(orderId);
        
        return res.status(200).json({
            success: true,
            data: orderStatus
        });
        
    } catch (error) {
        console.error('Order status error:', error);
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to get order status'
        });
    }
};

