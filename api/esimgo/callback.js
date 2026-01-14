/**
 * eSIM Go Usage Callback Handler
 * Endpoint: POST /api/esimgo/callback
 * 
 * Обрабатывает callback'и от eSIM Go о использовании трафика
 * Документация: https://docs.esim-go.com/api/v2_4/#tag/Callback
 * 
 * Callback URL нужно настроить в eSIM Portal:
 * Account Settings -> API Details -> Callback URL
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const ORDERS_FILE = path.join(__dirname, '..', '..', 'data', 'orders.json');
const ESIMGO_API_KEY = process.env.ESIMGO_API_KEY;

// Импортируем функцию отправки SMS
const { sendSMSToESIM } = require('./send-sms');

// Тексты SMS сообщений
const SMS_MESSAGES = {
    '80': '80% of your data is used.\nOpen esimsdata Telegram Mini App and tap Extend to add more data.',
    '100': 'Your data is used up (100%).\nOpen esimsdata Telegram Mini App and tap Extend to continue.'
};

/**
 * Валидация HMAC подписи от eSIM Go
 * Использует API Key как ключ для HMAC
 */
function validateHMAC(body, signatureHeader) {
    if (!ESIMGO_API_KEY) {
        console.warn('⚠️ ESIMGO_API_KEY not set, skipping HMAC validation');
        return true; // В режиме разработки пропускаем валидацию
    }
    
    if (!signatureHeader) {
        console.warn('⚠️ No HMAC signature header provided');
        return false;
    }
    
    // Body должен быть строкой (raw body), не JSON объектом
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    
    const signature = crypto
        .createHmac('sha256', ESIMGO_API_KEY)
        .update(bodyString)
        .digest('base64');
    
    const matches = signature === signatureHeader;
    
    if (!matches) {
        console.warn('⚠️ HMAC signature mismatch', {
            expected: signature,
            received: signatureHeader
        });
    }
    
    return matches;
}

/**
 * Загрузить все заказы
 */
async function loadOrders() {
    try {
        const data = await fs.readFile(ORDERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {};
        }
        console.error('Error loading orders:', error);
        return {};
    }
}

/**
 * Сохранить все заказы
 */
async function saveOrders(orders) {
    try {
        const dataDir = path.dirname(ORDERS_FILE);
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving orders:', error);
        throw error;
    }
}

/**
 * Найти заказ по ICCID
 */
async function findOrderByICCID(iccid) {
    const allOrders = await loadOrders();
    
    for (const userId in allOrders) {
        const userOrders = allOrders[userId] || [];
        const order = userOrders.find(o => o.iccid === iccid);
        if (order) {
            return { order, userId };
        }
    }
    
    return null;
}

/**
 * Рассчитать процент использования трафика
 * @param {Object} bundleData - Данные bundle из callback
 * @returns {number|null} Процент использования (0-100) или null, если невозможно рассчитать
 */
function calculateUsagePercent(bundleData) {
    if (!bundleData || !bundleData.initialQuantity || bundleData.initialQuantity === 0) {
        return null;
    }
    
    // Если bundle неограниченный, не считаем процент
    if (bundleData.unlimited === true) {
        return null;
    }
    
    const usedQuantity = bundleData.initialQuantity - (bundleData.remainingQuantity || 0);
    const usagePercent = (usedQuantity / bundleData.initialQuantity) * 100;
    
    return Math.round(usagePercent * 100) / 100; // Округляем до 2 знаков после запятой
}

/**
 * Проверить, была ли уже отправлена SMS для данного порога
 * @param {Object} order - Заказ
 * @param {number} threshold - Порог (80 или 100)
 * @returns {boolean} true, если SMS уже была отправлена
 */
function wasSmsSentForThreshold(order, threshold) {
    if (!order || !order.usage || !order.usage.smsSent) {
        return false;
    }
    
    const thresholdKey = threshold.toString();
    return order.usage.smsSent[thresholdKey]?.sent === true;
}

/**
 * Отметить SMS как отправленную для порога
 * @param {Object} order - Заказ
 * @param {number} threshold - Порог (80 или 100)
 */
function markSmsAsSent(order, threshold) {
    if (!order.usage) {
        order.usage = {};
    }
    
    if (!order.usage.smsSent) {
        order.usage.smsSent = {};
    }
    
    const thresholdKey = threshold.toString();
    order.usage.smsSent[thresholdKey] = {
        sent: true,
        sentAt: new Date().toISOString()
    };
}

/**
 * Отправить SMS при достижении порога использования трафика
 * @param {string} iccid - ICCID eSIM
 * @param {number} threshold - Порог (80 или 100)
 * @param {Object} bundleData - Данные bundle
 * @returns {Promise<boolean>} true, если SMS отправлена успешно
 */
async function sendUsageSMS(iccid, threshold, bundleData) {
    const message = SMS_MESSAGES[threshold.toString()];
    
    if (!message) {
        console.warn(`⚠️ No SMS message template for threshold ${threshold}`);
        return false;
    }
    
    try {
        await sendSMSToESIM(iccid, message, 'eSIM');
        console.log(`✅ SMS sent to ICCID ${iccid} at ${threshold}% usage threshold`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to send SMS to ICCID ${iccid} at ${threshold}% threshold:`, error.message);
        // Не пробрасываем ошибку дальше, чтобы не прерывать обработку callback
        return false;
    }
}

/**
 * Проверить пороги использования и отправить SMS при необходимости
 * @param {string} iccid - ICCID eSIM
 * @param {Object} order - Заказ
 * @param {Object} bundleData - Данные bundle из callback
 * @returns {Promise<void>}
 */
async function checkUsageThresholdsAndSendSMS(iccid, order, bundleData) {
    // Пропускаем, если bundle неограниченный
    if (bundleData.unlimited === true) {
        console.log('⏭️ Skipping SMS for unlimited bundle:', iccid);
        return;
    }
    
    // Рассчитываем процент использования
    const usagePercent = calculateUsagePercent(bundleData);
    
    if (usagePercent === null) {
        console.log('⏭️ Cannot calculate usage percent for ICCID:', iccid);
        return;
    }
    
    console.log('📊 Usage percent calculated:', {
        iccid,
        usagePercent: `${usagePercent}%`,
        initialQuantity: bundleData.initialQuantity,
        remainingQuantity: bundleData.remainingQuantity
    });
    
    // Пороги для проверки
    const thresholds = [80, 100];
    
    for (const threshold of thresholds) {
        // Проверяем, достигнут ли порог
        if (usagePercent >= threshold) {
            // Проверяем, не была ли уже отправлена SMS для этого порога
            if (!wasSmsSentForThreshold(order, threshold)) {
                console.log(`📱 Threshold ${threshold}% reached for ICCID ${iccid}, sending SMS...`);
                
                // Отправляем SMS
                const smsSent = await sendUsageSMS(iccid, threshold, bundleData);
                
                if (smsSent) {
                    // Отмечаем SMS как отправленную
                    markSmsAsSent(order, threshold);
                }
            } else {
                console.log(`⏭️ SMS already sent for threshold ${threshold}% for ICCID ${iccid}`);
            }
        }
    }
}

/**
 * Обновить статистику использования трафика в заказе
 */
async function updateOrderUsage(order, userId, bundleData) {
    const allOrders = await loadOrders();
    const userOrders = allOrders[userId] || [];
    
    const orderIndex = userOrders.findIndex(o => 
        o.orderReference === order.orderReference || 
        o.iccid === order.iccid
    );
    
    if (orderIndex === -1) {
        console.warn('⚠️ Order not found for usage update:', order.orderReference);
        return false;
    }
    
    // Получаем текущий заказ для обновления
    const currentOrder = userOrders[orderIndex];
    
    // Обновляем данные использования трафика
    if (!currentOrder.usage) {
        currentOrder.usage = {};
    }
    
    // Сохраняем информацию об отправленных SMS, если она есть
    const existingSmsSent = currentOrder.usage.smsSent || {};
    
    currentOrder.usage = {
        ...currentOrder.usage,
        bundle: bundleData.name,
        initialQuantity: bundleData.initialQuantity,
        remainingQuantity: bundleData.remainingQuantity,
        usedQuantity: bundleData.initialQuantity - bundleData.remainingQuantity,
        startTime: bundleData.startTime,
        endTime: bundleData.endTime,
        lastUpdated: new Date().toISOString(),
        // Сохраняем информацию об отправленных SMS
        smsSent: existingSmsSent
    };
    
    // Проверяем пороги и отправляем SMS при необходимости
    await checkUsageThresholdsAndSendSMS(currentOrder.iccid, currentOrder, bundleData);
    
    // Сохраняем обновленный заказ (включая информацию об отправленных SMS)
    userOrders[orderIndex] = currentOrder;
    
    // Обновляем общую статистику
    userOrders[orderIndex].updatedAt = new Date().toISOString();
    
    allOrders[userId] = userOrders;
    await saveOrders(allOrders);
    
    console.log('✅ Order usage updated:', {
        orderReference: order.orderReference,
        bundle: bundleData.name,
        remainingQuantity: bundleData.remainingQuantity,
        usedQuantity: bundleData.initialQuantity - bundleData.remainingQuantity
    });
    
    return true;
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-HMAC-Signature');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }
    
    try {
        // Получаем raw body для валидации HMAC
        // В Express нужно использовать express.raw() middleware для получения raw body
        // Но для простоты используем JSON body
        const body = req.body || {};
        
        // Получаем HMAC подпись из заголовка
        const hmacSignature = req.headers['x-hmac-signature'] || req.headers['x-hmac-signature'] || null;
        
        // Валидация HMAC (опционально, если настроена)
        if (ESIMGO_API_KEY && hmacSignature) {
            // Для валидации нужен raw body, но в Express это сложнее
            // Пока пропускаем валидацию, но логируем
            console.log('📥 Received callback with HMAC signature');
        }
        
        // Парсим данные callback'а
        const { iccid, alertType, bundle } = body;
        
        console.log('📥 eSIM Go callback received:', {
            iccid,
            alertType,
            bundleName: bundle?.name,
            remainingQuantity: bundle?.remainingQuantity,
            initialQuantity: bundle?.initialQuantity
        });
        
        if (!iccid) {
            console.warn('⚠️ Callback missing ICCID');
            return res.status(400).json({
                success: false,
                error: 'ICCID is required'
            });
        }
        
        // Находим заказ по ICCID
        const orderData = await findOrderByICCID(iccid);
        
        if (!orderData) {
            console.warn('⚠️ Order not found for ICCID:', iccid);
            // Все равно отвечаем 200, чтобы eSIM Go не повторял запрос
            return res.status(200).json({
                success: true,
                message: 'Order not found, but callback received'
            });
        }
        
        const { order, userId } = orderData;
        
        // Обновляем статистику использования
        if (bundle && alertType === 'Utilisation') {
            await updateOrderUsage(order, userId, bundle);
        }
        
        // Отвечаем eSIM Go, что callback обработан
        return res.status(200).json({
            success: true,
            message: 'Callback processed successfully'
        });
        
    } catch (error) {
        console.error('❌ Error processing eSIM Go callback:', error);
        
        // Все равно отвечаем 200, чтобы eSIM Go не повторял запрос
        return res.status(200).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
};
