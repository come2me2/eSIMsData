/**
 * API для работы с заказами пользователей
 * Endpoint: GET /api/orders?telegram_user_id=...
 * Endpoint: POST /api/orders (для сохранения заказа)
 * 
 * Сохраняет заказы в JSON файл для синхронизации между устройствами
 */

const fs = require('fs').promises;
const path = require('path');

const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');

// Создаем директорию data если её нет
async function ensureDataDir() {
    const dataDir = path.dirname(ORDERS_FILE);
    try {
        await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
        // Директория уже существует
    }
}

// Загрузить все заказы из файла
async function loadOrders() {
    try {
        await ensureDataDir();
        const data = await fs.readFile(ORDERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Файл не существует, возвращаем пустой объект
            return {};
        }
        console.error('Error loading orders:', error);
        return {};
    }
}

// Сохранить все заказы в файл
async function saveOrders(orders) {
    try {
        await ensureDataDir();
        await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving orders:', error);
        throw error;
    }
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // GET - получить заказы пользователя
    if (req.method === 'GET') {
        try {
            const { telegram_user_id } = req.query;
            
            if (!telegram_user_id) {
                return res.status(400).json({
                    success: false,
                    error: 'telegram_user_id is required'
                });
            }
            
            const allOrders = await loadOrders();
            const userOrders = allOrders[telegram_user_id] || [];
            
            // Сортируем по дате создания (новые первыми)
            userOrders.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.date || 0);
                const dateB = new Date(b.createdAt || b.date || 0);
                return dateB - dateA;
            });
            
            return res.status(200).json({
                success: true,
                data: userOrders
            });
            
        } catch (error) {
            console.error('Error getting orders:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to get orders'
            });
        }
    }
    
    // POST - сохранить заказ
    if (req.method === 'POST') {
        try {
            const {
                telegram_user_id,
                orderReference,
                iccid,
                matchingId,
                smdpAddress,
                country_code,
                country_name,
                plan_id,
                plan_type,
                bundle_name,
                price,
                currency,
                status = 'completed',
                createdAt
            } = req.body;
            
            if (!telegram_user_id) {
                return res.status(400).json({
                    success: false,
                    error: 'telegram_user_id is required'
                });
            }
            
            if (!orderReference) {
                return res.status(400).json({
                    success: false,
                    error: 'orderReference is required'
                });
            }
            
            const allOrders = await loadOrders();
            
            if (!allOrders[telegram_user_id]) {
                allOrders[telegram_user_id] = [];
            }
            
            // Проверяем, не существует ли уже такой заказ
            const existingIndex = allOrders[telegram_user_id].findIndex(
                o => o.orderReference === orderReference
            );
            
            const orderData = {
                orderReference,
                iccid: iccid || null,
                matchingId: matchingId || null,
                smdpAddress: smdpAddress || null,
                country_code: country_code || null,
                country_name: country_name || null,
                plan_id: plan_id || null,
                plan_type: plan_type || null,
                bundle_name: bundle_name || null,
                price: price || null,
                currency: currency || null,
                status,
                createdAt: createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            if (existingIndex >= 0) {
                // Обновляем существующий заказ
                allOrders[telegram_user_id][existingIndex] = {
                    ...allOrders[telegram_user_id][existingIndex],
                    ...orderData,
                    updatedAt: new Date().toISOString()
                };
            } else {
                // Добавляем новый заказ
                allOrders[telegram_user_id].push(orderData);
            }
            
            await saveOrders(allOrders);
            
            console.log('Order saved:', {
                telegram_user_id,
                orderReference,
                hasIccid: !!iccid
            });
            
            return res.status(200).json({
                success: true,
                data: orderData
            });
            
        } catch (error) {
            console.error('Error saving order:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Failed to save order'
            });
        }
    }
    
    return res.status(405).json({
        success: false,
        error: 'Method not allowed'
    });
};
