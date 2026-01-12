/**
 * Telegram Stars webhook handler
 * Endpoint: POST /api/telegram/stars/webhook
 *
 * Обрабатывает pre_checkout_query и successful_payment.
 * При успешной оплате создаёт заказ через eSIM Go API и отправляет пользователю статус.
 */

// Загружаем переменные окружения из .env файла (на случай, если они не загружены в server.js)
const path = require('path');
if (!process.env.TELEGRAM_BOT_TOKEN && !process.env.BOT_TOKEN) {
    try {
        require('dotenv').config({ path: path.join(__dirname, '../../.env') });
    } catch (e) {
        // Игнорируем ошибки загрузки .env
    }
}

// Загружаем переменные окружения с проверкой
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
// Разрешить тестовые платежи (для разработки/тестирования)
const ALLOW_TEST_PAYMENTS = process.env.ALLOW_TEST_PAYMENTS === 'true';

// Проверяем при загрузке модуля
if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in webhook.js');
} else {
    console.log('✅ TELEGRAM_BOT_TOKEN available in webhook.js');
}

if (ALLOW_TEST_PAYMENTS) {
    console.warn('⚠️ ALLOW_TEST_PAYMENTS is enabled - test payments will be processed');
} else {
    console.log('✅ Test payments are blocked (use ALLOW_TEST_PAYMENTS=true to enable)');
}

// Простейшая идемпотентность на время жизни процесса
const processedPayments = new Set();

// Переиспользуем уже существующий handler для создания заказа
// webhook.js находится в api/telegram/stars/, поэтому поднимаемся на два уровня
const createOrderHandler = require('../../esimgo/order');

function createMockReq(body = {}) {
    return {
        method: 'POST',
        body,
        headers: {},
        query: {}
    };
}

function createMockRes() {
    return {
        statusCode: 200,
        data: null,
        headers: {},
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.data = payload;
            return this;
        },
        setHeader(key, value) {
            this.headers[key] = value;
        },
        end() {
            return this;
        }
    };
}

async function callTelegram(method, payload) {
    if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not set');
    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (!data.ok) {
        console.error(`❌ Telegram ${method} failed:`, data);
        throw new Error(data.description || `${method} failed`);
    }
    return data.result;
}

async function answerPreCheckout(preCheckoutQuery) {
    try {
        console.log('✅ Answering pre_checkout_query with ok: true:', {
            query_id: preCheckoutQuery.id,
            user_id: preCheckoutQuery.from?.id
        });
        
        const result = await callTelegram('answerPreCheckoutQuery', {
            pre_checkout_query_id: preCheckoutQuery.id,
            ok: true
        });
        
        console.log('✅ Pre-checkout query answered successfully:', {
            query_id: preCheckoutQuery.id,
            result: result
        });
    } catch (error) {
        console.error('❌ answerPreCheckout failed:', {
            query_id: preCheckoutQuery.id,
            error: error.message,
            stack: error.stack
        });
        throw error; // Пробрасываем ошибку, чтобы она была видна в логах
    }
}

async function sendStatusMessage(chatId, text) {
    try {
        await callTelegram('sendMessage', {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
    } catch (error) {
        console.error('❌ sendMessage failed:', error.message);
    }
}

function safeParsePayload(payloadStr) {
    try {
        return JSON.parse(payloadStr);
    } catch (e) {
        return null;
    }
}

// Обновить статус заказа на failed при ошибке платежа
async function updateOrderStatusOnPaymentError(paymentSessionId, reason) {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        const ORDERS_FILE = path.join(__dirname, '..', '..', 'data', 'orders.json');
        
        const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
        const allOrders = JSON.parse(ordersData);
        let updated = false;
        
        // Ищем заказ по payment_session_id
        for (const userId in allOrders) {
            if (!Array.isArray(allOrders[userId])) continue;
            
            for (let i = 0; i < allOrders[userId].length; i++) {
                const order = allOrders[userId][i];
                
                if (order.status === 'on_hold' && 
                    order.payment_method === 'telegram_stars' &&
                    (order.payment_session_id === paymentSessionId || 
                     order.orderReference?.includes(paymentSessionId))) {
                    
                    allOrders[userId][i] = {
                        ...order,
                        status: 'failed',
                        failed_reason: reason,
                        payment_status: 'failed',
                        updatedAt: new Date().toISOString()
                    };
                    
                    updated = true;
                    console.log('❌ Order status updated to failed:', {
                        userId: userId,
                        orderReference: order.orderReference,
                        reason: reason
                    });
                    break;
                }
            }
            
            if (updated) break;
        }
        
        if (updated) {
            await fs.writeFile(ORDERS_FILE, JSON.stringify(allOrders, null, 2), 'utf8');
        }
    } catch (error) {
        console.warn('⚠️ Failed to update order status on payment error:', error.message);
    }
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-telegram-bot-api-secret-token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    if (WEBHOOK_SECRET) {
        const headerToken = req.headers['x-telegram-bot-api-secret-token'];
        if (!headerToken || headerToken !== WEBHOOK_SECRET) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
    }

    // Сразу отвечаем Telegram, чтобы не было таймаута
    // Вся обработка будет асинхронной
    res.status(200).json({ ok: true });
    
    const update = req.body || {};
    
    // Логируем входящий update для диагностики
    console.log('📥 Webhook update received:', {
        has_pre_checkout_query: !!update.pre_checkout_query,
        has_successful_payment: !!(update.message && update.message.successful_payment),
        has_message: !!update.message,
        update_id: update.update_id
    });

    // Обработка pre_checkout_query
    if (update.pre_checkout_query) {
        const pq = update.pre_checkout_query;
        const userId = pq.from?.id;
        
        console.log('🔍 Pre-checkout query received:', {
            query_id: pq.id,
            user_id: userId,
            total_amount: pq.total_amount,
            currency: pq.currency,
            invoice_payload: pq.invoice_payload?.substring(0, 100) + '...'
        });
        
        const payloadObj = safeParsePayload(pq.invoice_payload);

        if (!payloadObj) {
            console.error('❌ Invalid payload in pre_checkout_query:', {
                query_id: pq.id,
                user_id: userId,
                invoice_payload: pq.invoice_payload
            });
            
            await callTelegram('answerPreCheckoutQuery', {
                pre_checkout_query_id: pq.id,
                ok: false,
                error_message: 'Invalid payload. Please try again.'
            });
            // Обновляем заказ на failed если он существует
            await updateOrderStatusOnPaymentError(pq.id, 'Invalid payload');
            return;
        }

        // Проверяем сумму: payload amt против total_amount
        // ВАЖНО: Разрешаем небольшие расхождения (до 1 Star) из-за округления
        const totalStars = pq.total_amount; // В Stars
        const payloadAmount = payloadObj.amt ? Number(payloadObj.amt) : null;
        const amountDifference = payloadAmount !== null ? Math.abs(payloadAmount - Number(totalStars)) : 0;
        
        // Разрешаем расхождения до 1 Star (из-за округления)
        if (payloadAmount !== null && amountDifference > 1) {
            console.error('❌ Price mismatch in pre_checkout_query:', {
                query_id: pq.id,
                user_id: userId,
                payload_amount: payloadObj.amt,
                total_amount: totalStars,
                difference: amountDifference
            });
            
            await callTelegram('answerPreCheckoutQuery', {
                pre_checkout_query_id: pq.id,
                ok: false,
                error_message: 'Price mismatch. Please try again.'
            });
            // Обновляем заказ на failed если он существует
            await updateOrderStatusOnPaymentError(pq.id, 'Price mismatch');
            return;
        } else if (payloadAmount !== null && amountDifference > 0) {
            console.warn('⚠️ Minor price difference (allowed):', {
                query_id: pq.id,
                user_id: userId,
                payload_amount: payloadObj.amt,
                total_amount: totalStars,
                difference: amountDifference
            });
            // Небольшое расхождение - разрешаем оплату
        }

        console.log('✅ Pre-checkout query validated successfully:', {
            query_id: pq.id,
            user_id: userId,
            bundle_name: payloadObj.bn,
            plan_id: payloadObj.pid
        });
        
        await answerPreCheckout(pq);
        return;
    }
    
    // Обработка ошибок платежа (если есть)
    if (update.message && update.message.successful_payment === false) {
        // Пользователь отменил оплату или произошла ошибка
        const paymentId = update.message.payment?.telegram_payment_charge_id || 
                         update.message.payment?.provider_payment_charge_id;
        
        if (paymentId) {
            await updateOrderStatusOnPaymentError(paymentId, 'Payment canceled by user');
        }
        
        return;
    }

    // Обработка успешного платежа
    const message = update.message;
    if (message && message.successful_payment) {
        const payment = message.successful_payment;
        const payloadObj = safeParsePayload(payment.invoice_payload);

        if (!payloadObj || !payloadObj.bn || !payloadObj.pid) {
            console.error('❌ Invalid payload in successful_payment:', {
                payload: payment.invoice_payload,
                parsed: payloadObj
            });
            return;
        }

        // 🔍 Проверка на тестовый платеж
        const paymentId =
            payment.provider_payment_charge_id ||
            payment.telegram_payment_charge_id ||
            payment.invoice_payload;
        
        const isTestPayment = 
            (paymentId && (
                String(paymentId).toLowerCase().includes('test') ||
                String(paymentId).startsWith('test_')
            )) ||
            (payment.telegram_payment_charge_id && 
                String(payment.telegram_payment_charge_id).toLowerCase().includes('test')) ||
            (payment.provider_payment_charge_id && 
                String(payment.provider_payment_charge_id).toLowerCase().includes('test')) ||
            (payment.total_amount && Number(payment.total_amount) === 0);

        // 📊 Логируем все данные платежа для диагностики
        console.log('💰 Payment received:', {
            paymentId,
            telegram_payment_charge_id: payment.telegram_payment_charge_id,
            provider_payment_charge_id: payment.provider_payment_charge_id,
            total_amount: payment.total_amount,
            currency: payment.currency,
            isTestPayment,
            invoice_payload: payment.invoice_payload,
            user_id: message.from?.id,
            username: message.from?.username
        });

        // ⚠️ Блокируем тестовые платежи в продакшене (если не разрешено)
        if (isTestPayment && !ALLOW_TEST_PAYMENTS) {
            console.warn('⚠️ TEST PAYMENT DETECTED - Order creation blocked:', {
                paymentId,
                user_id: message.from?.id,
                bundle: payloadObj.bn,
                reason: 'Test payment detected and ALLOW_TEST_PAYMENTS is disabled'
            });
            
            await sendStatusMessage(message.chat.id, [
                '⚠️ <b>Тестовый платеж обнаружен</b>',
                'Заказ не был создан, так как это тестовый платеж.',
                'Для реальных покупок используйте реальные Telegram Stars.',
                `Платёж ID: <code>${paymentId}</code>`
            ].join('\n'));
            
            return;
        }
        
        if (isTestPayment && ALLOW_TEST_PAYMENTS) {
            console.warn('⚠️ TEST PAYMENT DETECTED - Processing anyway (ALLOW_TEST_PAYMENTS=true):', {
                paymentId,
                user_id: message.from?.id,
                bundle: payloadObj.bn
            });
        }

        if (processedPayments.has(paymentId)) {
            console.log('⚠️ Duplicate payment detected:', paymentId);
            return;
        }

        processedPayments.add(paymentId);

        const telegramUserId = payloadObj.uid || (message.from && message.from.id);
        
        // Ищем существующий заказ on_hold по payment_session_id (invoice ID)
        let existingOrder = null;
        
        try {
            // Загружаем все заказы пользователя
            const fs = require('fs').promises;
            const path = require('path');
            const ORDERS_FILE = path.join(__dirname, '..', '..', 'data', 'orders.json');
            
            try {
                const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
                const allOrders = JSON.parse(ordersData);
                const userOrders = allOrders[telegramUserId] || [];
                
                // Ищем заказ по payment_session_id (invoice ID из payload или payment)
                // Invoice ID может быть в разных местах, проверяем все варианты
                const invoiceId = payment.telegram_payment_charge_id || payment.provider_payment_charge_id || paymentId;
                
                existingOrder = userOrders.find(o => 
                    o.status === 'on_hold' && 
                    o.payment_method === 'telegram_stars' &&
                    (o.payment_session_id === invoiceId || 
                     o.orderReference?.includes(invoiceId) ||
                     o.payment_session_id === paymentId ||
                     (o.orderReference && o.orderReference.startsWith('pending_') && o.orderReference.includes(invoiceId)))
                );
                
                if (existingOrder) {
                    console.log('✅ Found existing on_hold order:', {
                        orderReference: existingOrder.orderReference,
                        payment_session_id: existingOrder.payment_session_id,
                        invoiceId: invoiceId,
                        expires_at: existingOrder.expires_at
                    });
                } else {
                    console.log('ℹ️ No existing on_hold order found, will create new order');
                }
            } catch (loadError) {
                console.warn('⚠️ Failed to load orders to find existing order:', loadError.message);
            }
        } catch (searchError) {
            console.warn('⚠️ Error searching for existing order:', searchError.message);
        }

        // Собираем данные для заказа
        const orderReq = createMockReq({
            bundle_name: payloadObj.bn,
            telegram_user_id: telegramUserId,
            telegram_username: message.from && message.from.username,
            user_name: message.from && message.from.first_name,
            country_code: payloadObj.cc,
            country_name: payloadObj.cn,
            plan_id: payloadObj.pid,
            plan_type: payloadObj.pt,
            test_mode: false
        });

        const orderRes = createMockRes();

        try {
            await Promise.resolve(createOrderHandler(orderReq, orderRes));

            const success = orderRes.statusCode === 200 && orderRes.data && orderRes.data.success;

            if (success) {
                const orderData = orderRes.data.data;
                const orderRef = orderData.orderReference || orderData.reference || 'order created';
                let assignments = orderData.assignments || null;
                
                // Получаем полные данные заказа из eSIMgo API для получения всех параметров
                let fullOrderData = null;
                if (orderRef) {
                    try {
                        const esimgoClient = require('../../_lib/esimgo/client');
                        // Ждем немного, чтобы заказ был полностью обработан
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // Получаем полный статус заказа из eSIMgo
                        fullOrderData = await esimgoClient.getOrderStatus(orderRef);
                        console.log('✅ Full order data retrieved from eSIMgo:', {
                            orderReference: fullOrderData.orderReference,
                            status: fullOrderData.status,
                            total: fullOrderData.total,
                            currency: fullOrderData.currency
                        });
                        
                        // Если assignments не были получены ранее, пытаемся получить их
                        if (!assignments && fullOrderData.status === 'completed') {
                            try {
                                // Получаем assignments с QR кодом
                                assignments = await esimgoClient.getESIMAssignments(orderRef, 'qrCode');
                                console.log('✅ Assignments retrieved:', {
                                    hasIccid: !!assignments?.iccid,
                                    hasMatchingId: !!assignments?.matchingId,
                                    hasSmdpAddress: !!assignments?.smdpAddress,
                                    hasQrCode: !!assignments?.qrCode
                                });
                            } catch (assignError) {
                                console.warn('⚠️ Failed to get assignments:', assignError.message);
                            }
                        }
                    } catch (orderStatusError) {
                        console.warn('⚠️ Failed to get full order data from eSIMgo:', orderStatusError.message);
                        // Используем данные из orderData как fallback
                    }
                }
                
                // Используем полные данные из eSIMgo, если они доступны
                const finalOrderData = fullOrderData || orderData;
                
                // Проверяем, выдана ли eSIM
                const hasEsim = !!(assignments?.iccid || assignments?.matchingId || 
                                  finalOrderData.order?.[0]?.esims?.[0]?.iccid);
                
                // Определяем финальный статус:
                // COMPLETED только если платеж подтвержден И eSIM выдана
                // Если платеж подтвержден, но eSIM не выдана - оставляем ON HOLD
                let finalStatus = 'on_hold';
                if (success && hasEsim) {
                    finalStatus = 'completed';
                } else if (success && !hasEsim) {
                    finalStatus = 'on_hold';
                    console.warn('⚠️ Payment confirmed but eSIM not issued yet. Keeping status on_hold.');
                }
                
                // Сохраняем заказ через API
                try {
                    // Если был заказ on_hold, используем его orderReference для обновления
                    // Иначе используем новый orderReference из eSIM Go
                    const finalOrderReference = existingOrder && existingOrder.orderReference?.startsWith('pending_') 
                        ? orderRef  // Заменяем временный ID на реальный
                        : orderRef;
                    
                    const saveOrderReq = {
                        telegram_user_id: telegramUserId,
                        orderReference: finalOrderReference, // Используем реальный orderReference из eSIM Go
                        iccid: assignments?.iccid || finalOrderData.order?.[0]?.esims?.[0]?.iccid || null,
                        matchingId: assignments?.matchingId || null,
                        smdpAddress: assignments?.smdpAddress || null,
                        qrCode: assignments?.qrCode || assignments?.qr_code || finalOrderData.order?.[0]?.esims?.[0]?.qrCode || null,
                        country_code: payloadObj.cc || null,
                        country_name: payloadObj.cn || null,
                        plan_id: payloadObj.pid || null,
                        plan_type: payloadObj.pt || null,
                        bundle_name: payloadObj.bn || null,
                        price: finalOrderData.total || orderData.total || null,
                        currency: finalOrderData.currency || orderData.currency || 'USD',
                        status: finalStatus, // Используем определенный статус
                        createdAt: existingOrder?.createdAt || new Date().toISOString(), // Сохраняем оригинальную дату создания
                        // Новые обязательные поля
                        source: 'telegram_mini_app',
                        customer: telegramUserId,
                        provider_product_id: payloadObj.bn || null,
                        provider_base_price_usd: payloadObj.bp || finalOrderData.basePrice || orderData.basePrice || null,
                        payment_method: 'telegram_stars',
                        // Новые поля для статусов
                        payment_session_id: existingOrder?.payment_session_id || paymentId,
                        payment_status: 'succeeded',
                        payment_confirmed: true,
                        esim_issued: hasEsim,
                        esim_checked_at: new Date().toISOString(),
                        expires_at: null // Убираем таймаут после подтверждения платежа
                    };
                    
                    // Если обновляем существующий заказ, нужно обновить по старому orderReference
                    if (existingOrder && existingOrder.orderReference?.startsWith('pending_')) {
                        // Сначала удаляем старый заказ с временным ID
                        try {
                            const fs = require('fs').promises;
                            const path = require('path');
                            const ORDERS_FILE = path.join(__dirname, '..', '..', 'data', 'orders.json');
                            const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
                            const allOrders = JSON.parse(ordersData);
                            const userOrders = allOrders[telegramUserId] || [];
                            const oldIndex = userOrders.findIndex(o => o.orderReference === existingOrder.orderReference);
                            if (oldIndex >= 0) {
                                userOrders.splice(oldIndex, 1);
                                await fs.writeFile(ORDERS_FILE, JSON.stringify(allOrders, null, 2), 'utf8');
                                console.log('✅ Removed old pending order:', existingOrder.orderReference);
                            }
                        } catch (removeError) {
                            console.warn('⚠️ Failed to remove old pending order:', removeError.message);
                        }
                    }
                    
                    // Вызываем API для сохранения заказа
                    const saveOrderRes = createMockRes();
                    await Promise.resolve(ordersHandler(createMockReq(saveOrderReq), saveOrderRes));
                    
                    if (saveOrderRes.statusCode === 200) {
                        console.log('✅ Order updated in database:', {
                            orderReference: orderRef,
                            status: finalStatus,
                            hasEsim: hasEsim,
                            wasOnHold: !!existingOrder
                        });
                    } else {
                        console.warn('⚠️ Failed to save order to database:', saveOrderRes.data);
                    }
                } catch (saveError) {
                    console.error('❌ Error saving order to database:', saveError);
                    // Не критично, продолжаем
                }
                
                // Отправляем сообщение об успешной оплате
                const paymentMessage = [
                    '✅ <b>Payment with Stars successful</b>',
                    `Plan: ${payloadObj.pid || 'N/A'}`,
                    `Country: ${payloadObj.cc || payloadObj.cn || 'N/A'}`,
                    `Order: <code>${orderRef}</code>`
                ].join('\n');
                
                await sendStatusMessage(message.chat.id, paymentMessage);
                
                // Если есть данные eSIM, отправляем отдельное сообщение с данными eSIM/QR
                if (assignments && assignments.iccid) {
                    // Небольшая задержка между сообщениями
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Формируем сообщение с данными eSIM
                    let esimMessage = `📱 <b>Your eSIM data:</b>\n\n`;
                    if (assignments.iccid) {
                        esimMessage += `ICCID: <code>${assignments.iccid}</code>\n`;
                    }
                    if (assignments.matchingId) {
                        esimMessage += `Matching ID: <code>${assignments.matchingId}</code>\n`;
                    }
                    if (assignments.smdpAddress) {
                        esimMessage += `RSP URL: <code>${assignments.smdpAddress}</code>\n`;
                    }
                    
                    // Отправляем текстовое сообщение с данными eSIM
                    const botToken = BOT_TOKEN;
                    if (botToken) {
                        try {
                            const textResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    chat_id: message.chat.id,
                                    text: esimMessage,
                                    parse_mode: 'HTML'
                                })
                            });
                            
                            const textData = await textResponse.json();
                            
                            // Если есть QR код, отправляем фото
                            const qrCode = assignments.qrCode || assignments.qr_code;
                            if (qrCode && textData.ok) {
                                await new Promise(resolve => setTimeout(resolve, 500));
                                
                                const photoResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        chat_id: message.chat.id,
                                        photo: qrCode,
                                        caption: 'QR code for eSIM activation'
                                    })
                                });
                                
                                const photoData = await photoResponse.json();
                                if (!photoData.ok) {
                                    console.warn('⚠️ Failed to send QR code photo:', photoData);
                                }
                            }
                        } catch (esimError) {
                            console.error('❌ Error sending eSIM data message:', esimError);
                        }
                    }
                } else {
                    // Если eSIM еще не готова, отправляем сообщение об обработке
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await sendStatusMessage(message.chat.id, 'eSIM is being processed. Please check back in a few minutes.');
                }
            } else {
                // Заказ не создан в eSIM Go - обновляем существующий заказ на failed
                if (existingOrder) {
                    try {
                        const ordersHandler = require('../orders');
                        const updateReq = {
                            method: 'POST',
                            body: {
                                telegram_user_id: telegramUserId,
                                orderReference: existingOrder.orderReference,
                                status: 'failed',
                                failed_reason: 'esim_order_creation_failed',
                                payment_status: 'succeeded', // Платеж прошел, но заказ не создан
                                payment_confirmed: true,
                                esim_issued: false,
                                updatedAt: new Date().toISOString()
                            }
                        };
                        const updateRes = createMockRes();
                        await Promise.resolve(ordersHandler(createMockReq(updateReq), updateRes));
                        console.log('❌ Order updated to failed (eSIM order creation failed)');
                    } catch (updateError) {
                        console.error('❌ Error updating order to failed:', updateError);
                    }
                }
                
            await sendStatusMessage(message.chat.id, [
                '⚠️ Payment received, but order was not created.',
                'We are already investigating. Please contact support.',
                `Payment ID: <code>${paymentId}</code>`
            ].join('\n'));
            }
        } catch (error) {
            console.error('❌ Error creating order after payment:', error);
            
            // Обновляем существующий заказ на failed при ошибке
            if (existingOrder) {
                try {
                    const ordersHandler = require('../orders');
                    const updateReq = {
                        method: 'POST',
                        body: {
                            telegram_user_id: telegramUserId,
                            orderReference: existingOrder.orderReference,
                            status: 'failed',
                            failed_reason: 'esim_order_creation_error',
                            payment_status: 'succeeded',
                            payment_confirmed: true,
                            esim_issued: false,
                            updatedAt: new Date().toISOString()
                        }
                    };
                    const updateRes = createMockRes();
                    await Promise.resolve(ordersHandler(createMockReq(updateReq), updateRes));
                    console.log('❌ Order updated to failed (error during order creation)');
                } catch (updateError) {
                    console.error('❌ Error updating order to failed:', updateError);
                }
            }
            
            await sendStatusMessage(message.chat.id, [
                '⚠️ Оплата прошла, но произошла ошибка при создании заказа.',
                'Мы уже разбираемся. Пожалуйста, свяжитесь с поддержкой.',
                `Платёж: <code>${paymentId}</code>`
            ].join('\n'));
        }

        return;
    }
    
    // Прочие обновления нам не интересны
    return;
};
