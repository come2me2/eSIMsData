/**
 * eSIM Go API - Создание заказа eSIM
 * Endpoint: POST /orders
 * Документация: https://docs.esim-go.com/api/v2_4/#tag/Orders
 */

const esimgoClient = require('../_lib/esimgo/client');

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
        
        // Определяем режим работы: validate (тест) или transaction (реальный заказ)
        // Можно переопределить через переменную окружения ESIMGO_ORDER_MODE
        // или через параметр test_mode в запросе
        const orderMode = req.body.test_mode === true 
            ? 'validate' 
            : (process.env.ESIMGO_ORDER_MODE === 'validate' ? 'validate' : 'transaction');
        
        const isTestMode = orderMode === 'validate';
        
        if (isTestMode) {
            console.log('⚠️ TEST MODE: Using validate instead of transaction (no real order will be created)');
        }
        
        // Создаём заказ в eSIM Go согласно API v2.4
        // Структура: { type: 'transaction'|'validate', assign: true, order: [{ type: 'bundle', quantity: 1, item: bundleName }] }
        const orderData = {
            type: orderMode, // 'transaction' для создания заказа, 'validate' для проверки
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
        
        console.log('Order ' + (isTestMode ? 'validated' : 'created') + ':', {
            mode: orderMode,
            orderReference: order.orderReference,
            status: order.status,
            statusMessage: order.statusMessage,
            valid: order.valid, // для validate режима
            total: order.total,
            currency: order.currency,
            telegram_user_id,
            bundle_name: bundleName,
            country_code,
            hasEsims: !!order.order?.[0]?.esims
        });
        
        // В режиме validate не получаем assignments (заказ не создан)
        if (isTestMode) {
            return res.status(200).json({
                success: true,
                test_mode: true,
                data: {
                    ...order,
                    telegram_user_id,
                    country_code,
                    country_name,
                    plan_id,
                    plan_type,
                    bundle_name: bundleName,
                    note: 'This is a validation request. No real order was created. Set test_mode: false to create a real order.'
                }
            });
        }
        
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
            test_mode: false,
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

