/**
 * eSIM Go API - Создание заказа eSIM
 * Endpoint: POST /orders
 * Документация: https://docs.esim-go.com/api/v2_4/#tag/Orders
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
            bundle_name, // bundle name из каталога (например: "esim_1GB_7D_TH_V2")
            bundle_id, // для обратной совместимости
            iccid,
            telegram_user_id,
            country_code,
            country_name,
            plan_id,
            plan_type,
            assign = true // автоматически назначить bundle на eSIM
        } = req.body;
        
        // Валидация обязательных полей
        const bundleName = bundle_name || bundle_id;
        if (!bundleName) {
            return res.status(400).json({
                success: false,
                error: 'bundle_name is required (e.g., "esim_1GB_7D_TH_V2")'
            });
        }
        
        // Создаём заказ в eSIM Go согласно API v2.4
        // Структура: { type: 'transaction', assign: true, order: [{ type: 'bundle', quantity: 1, item: bundleName }] }
        const orderData = {
            type: 'transaction', // 'transaction' для создания заказа, 'validate' для проверки
            assign: assign, // автоматически назначить bundle на eSIM
            order: [{
                type: 'bundle',
                quantity: 1,
                item: bundleName, // bundle name из каталога
                allowReassign: false // не переназначать на новый eSIM если несовместим
            }]
        };
        
        // Если уже есть eSIM (ICCID), добавляем в order
        if (iccid) {
            orderData.order[0].iccids = [iccid];
        }
        
        const order = await esimgoClient.createOrder(orderData);
        
        console.log('Order created:', {
            orderReference: order.orderReference,
            status: order.status,
            statusMessage: order.statusMessage,
            telegram_user_id,
            bundle_name: bundleName,
            country_code,
            hasEsims: !!order.order?.[0]?.esims
        });
        
        // Получаем детали установки eSIM (QR код, SMDP+ адрес) если заказ успешен
        let assignments = null;
        if (order.orderReference && order.status === 'completed') {
            try {
                // Ждем немного, чтобы eSIM был готов
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                assignments = await esimgoClient.getESIMAssignments(order.orderReference);
                console.log('Assignments received:', {
                    hasIccid: !!assignments.iccid,
                    hasMatchingId: !!assignments.matchingId,
                    hasSmdpAddress: !!assignments.smdpAddress
                });
            } catch (assignError) {
                console.warn('Failed to get assignments immediately:', assignError.message);
                // Не критично, можно получить позже через /api/esimgo/assignments
            }
        }
        
        // TODO: Сохранить заказ в БД с привязкой к telegram_user_id
        
        return res.status(200).json({
            success: true,
            data: {
                ...order,
                assignments: assignments, // QR код и данные для установки
                telegram_user_id,
                country_code,
                country_name,
                plan_id,
                plan_type,
                bundle_name: bundleName
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

