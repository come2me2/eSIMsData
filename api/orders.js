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

/**
 * Генерирует URL QR кода для eSIM в формате LPA
 * Формат: LPA:1$smdpAddress$matchingId
 */
function generateQRCode(matchingId, smdpAddress) {
    if (!matchingId || !smdpAddress) {
        return null;
    }
    // Формат LPA для eSIM активации
    const lpaString = `LPA:1$${smdpAddress}$${matchingId}`;
    // Используем внешний сервис для генерации QR кода
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lpaString)}`;
}

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
            let { telegram_user_id } = req.query;
            
            if (!telegram_user_id) {
                return res.status(400).json({
                    success: false,
                    error: 'telegram_user_id is required'
                });
            }
            
            // Преобразуем в строку для единообразия (в базе хранится как строка)
            telegram_user_id = String(telegram_user_id);
            
            const allOrders = await loadOrders();
            
            // Проверяем, есть ли заказы для этого пользователя (как строка)
            // Также проверяем числовой вариант, если пользователь передал число
            let userOrders = allOrders[telegram_user_id] || [];
            
            // Если не нашли по строковому ключу, пробуем числовой
            if (userOrders.length === 0) {
                const numericKey = parseInt(telegram_user_id);
                if (!isNaN(numericKey)) {
                    userOrders = allOrders[String(numericKey)] || allOrders[numericKey] || [];
                }
            }
            
            console.log(`[Orders API] Getting orders for user ${telegram_user_id}: found ${userOrders.length} orders`);
            
            // Сортируем по дате создания (новые первыми)
            userOrders.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.date || 0);
                const dateB = new Date(b.createdAt || b.date || 0);
                return dateB - dateA;
            });
            
            // Фильтруем только заказы со статусом completed, on_hold, failed, canceled
            // Исключаем pending_ заказы (временные, которые еще не оплачены)
            const validOrders = userOrders.filter(order => {
                // Исключаем временные заказы с pending_ в orderReference
                if (order.orderReference && order.orderReference.startsWith('pending_')) {
                    return false;
                }
                // Включаем все заказы с валидным статусом
                return order.status && ['completed', 'on_hold', 'failed', 'canceled', 'pending', 'processing'].includes(order.status);
            });
            
            console.log(`[Orders API] Filtered orders: ${validOrders.length} valid orders out of ${userOrders.length} total`);
            
            return res.status(200).json({
                success: true,
                data: validOrders
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
                qrCode,
                country_code,
                country_name,
                plan_id,
                plan_type,
                bundle_name,
                price,
                finalPrice, // ✅ ИСПРАВЛЕНИЕ: Финальная цена с наценками
                currency,
                status = 'completed',
                createdAt,
                // Новые обязательные поля
                source = 'telegram_mini_app',
                customer, // Если не передано, используем telegram_user_id
                provider_product_id, // Если не передано, используем bundle_name
                provider_base_price_usd,
                payment_method,
                // Промокод
                promocode,
                discount_amount,
                discount_percent,
                // Новые поля для статусов
                payment_session_id,
                payment_status,
                expires_at,
                canceled_reason,
                failed_reason,
                payment_confirmed,
                esim_issued,
                esim_checked_at
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
            
            // Извлекаем дату и время из createdAt
            const createdAtDate = createdAt ? new Date(createdAt) : new Date();
            const date = createdAtDate.toISOString().split('T')[0]; // YYYY-MM-DD
            const time = createdAtDate.toTimeString().split(' ')[0]; // HH:MM:SS
            
            // Определяем статусы платежа и eSIM
            const isPaymentConfirmed = payment_confirmed !== undefined ? payment_confirmed : (status === 'completed');
            const isEsimIssued = esim_issued !== undefined ? esim_issued : !!(iccid || matchingId);
            
            const orderData = {
                // Базовые поля
                orderReference,
                number: orderReference, // Дублируем для удобства
                
                // Обязательные поля согласно требованиям
                source: source || 'telegram_mini_app',
                customer: customer || telegram_user_id,
                provider_product_id: provider_product_id || bundle_name || null,
                provider_base_price_usd: provider_base_price_usd || null,
                payment_method: payment_method || null,
                date: date,
                time: time,
                status: status,
                
                // eSIM данные
                iccid: iccid || null,
                matchingId: matchingId || null,
                smdpAddress: smdpAddress || null,
                // QR код: используем переданный или генерируем из данных eSIM
                qrCode: qrCode || (matchingId && smdpAddress ? generateQRCode(matchingId, smdpAddress) : null),
                qr_code: qrCode || (matchingId && smdpAddress ? generateQRCode(matchingId, smdpAddress) : null), // Для обратной совместимости
                
                // Географические данные
                country_code: country_code || null,
                country_name: country_name || null,
                
                // План данных
                plan_id: plan_id || null,
                plan_type: plan_type || null,
                bundle_name: bundle_name || null,
                
                // Цены
                price: price || null,
                finalPrice: finalPrice || null, // ✅ ИСПРАВЛЕНИЕ: Сохраняем finalPrice для отображения финальной цены с наценками
                currency: currency || null,
                
                // Промокод
                promocode: promocode || null,
                discount_amount: discount_amount || null,
                discount_percent: discount_percent || null,
                
                // Новые поля для статусов
                payment_session_id: payment_session_id || null,
                payment_status: payment_status || (isPaymentConfirmed ? 'succeeded' : 'pending'),
                expires_at: expires_at || null,
                canceled_reason: canceled_reason || null,
                failed_reason: failed_reason || null,
                payment_confirmed: isPaymentConfirmed,
                esim_issued: isEsimIssued,
                esim_checked_at: esim_checked_at || null,
                
                // Временные метки
                createdAt: createdAt || createdAtDate.toISOString(),
                updatedAt: new Date().toISOString(),
                
                // Для обратной совместимости
                telegram_user_id: telegram_user_id,
                paymentType: payment_method // Для обратной совместимости
            };
            
            if (existingIndex >= 0) {
                // Обновляем существующий заказ, сохраняя оригинальные поля если они не переданы
                const existingOrder = allOrders[telegram_user_id][existingIndex];
                allOrders[telegram_user_id][existingIndex] = {
                    ...existingOrder,
                    ...orderData,
                    // Сохраняем оригинальную дату создания если не передана новая
                    createdAt: createdAt || existingOrder.createdAt || new Date().toISOString(),
                    // Сохраняем expires_at если он был установлен и не передано новое значение
                    expires_at: expires_at !== undefined ? expires_at : existingOrder.expires_at,
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




