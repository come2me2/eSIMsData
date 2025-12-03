/**
 * eSIM Go API - Создание заказа eSIM
 * Endpoint: POST /orders
 * Документация: https://docs.esim-go.com/api/v2_0/#tag/Orders
 */

const esimgoClient = require('./client');

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const {
            bundle_id,
            iccid,
            telegram_user_id,
            country_code,
            country_name,
            plan_id,
            plan_type
        } = req.body;
        
        // Валидация обязательных полей
        if (!bundle_id) {
            return res.status(400).json({
                success: false,
                error: 'bundle_id is required'
            });
        }
        
        // Создаём заказ в eSIM Go
        const orderData = {
            type: 'transaction', // Тип транзакции для заказа пакета данных
            bundle_id: bundle_id
        };
        
        // Если уже есть eSIM (ICCID), привязываем к нему
        if (iccid) {
            orderData.iccid = iccid;
        }
        
        const order = await esimgoClient.createOrder(orderData);
        
        console.log('Order created:', {
            orderId: order.id || order.order_id,
            telegram_user_id,
            bundle_id,
            country_code
        });
        
        // TODO: Сохранить заказ в БД с привязкой к telegram_user_id
        
        return res.status(200).json({
            success: true,
            data: {
                ...order,
                telegram_user_id,
                country_code,
                country_name,
                plan_id,
                plan_type
            }
        });
        
    } catch (error) {
        console.error('Order creation error:', error);
        
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to create order'
        });
    }
};

