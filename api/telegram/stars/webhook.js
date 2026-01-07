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

// Проверяем при загрузке модуля
if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in webhook.js');
} else {
    console.log('✅ TELEGRAM_BOT_TOKEN available in webhook.js');
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
        await callTelegram('answerPreCheckoutQuery', {
            pre_checkout_query_id: preCheckoutQuery.id,
            ok: true
        });
    } catch (error) {
        console.error('❌ answerPreCheckout failed:', error.message);
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

    const update = req.body || {};

    // Обработка pre_checkout_query
    if (update.pre_checkout_query) {
        const pq = update.pre_checkout_query;
        const payloadObj = safeParsePayload(pq.invoice_payload);

        if (!payloadObj) {
            await callTelegram('answerPreCheckoutQuery', {
                pre_checkout_query_id: pq.id,
                ok: false,
                error_message: 'Invalid payload'
            });
            return res.status(200).json({ ok: true });
        }

        // Проверяем сумму: payload amt против total_amount
        const totalStars = pq.total_amount; // В Stars
        if (payloadObj.amt && Number(payloadObj.amt) !== Number(totalStars)) {
            await callTelegram('answerPreCheckoutQuery', {
                pre_checkout_query_id: pq.id,
                ok: false,
                error_message: 'Price mismatch'
            });
            return res.status(200).json({ ok: true });
        }

        await answerPreCheckout(pq);
        return res.status(200).json({ ok: true });
    }

    // Обработка успешного платежа
    const message = update.message;
    if (message && message.successful_payment) {
        const payment = message.successful_payment;
        const payloadObj = safeParsePayload(payment.invoice_payload);

        if (!payloadObj || !payloadObj.bn || !payloadObj.pid) {
            console.error('❌ Invalid payload in successful_payment');
            return res.status(200).json({ ok: true });
        }

        const paymentId =
            payment.provider_payment_charge_id ||
            payment.telegram_payment_charge_id ||
            payment.invoice_payload;

        if (processedPayments.has(paymentId)) {
            return res.status(200).json({ ok: true });
        }

        processedPayments.add(paymentId);

        // Собираем данные для заказа
        const orderReq = createMockReq({
            bundle_name: payloadObj.bn,
            telegram_user_id: payloadObj.uid || (message.from && message.from.id),
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
                                assignments = await esimgoClient.getESIMAssignments(orderRef);
                                console.log('✅ Assignments retrieved:', {
                                    hasIccid: !!assignments?.iccid,
                                    hasMatchingId: !!assignments?.matchingId,
                                    hasSmdpAddress: !!assignments?.smdpAddress
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
                
                // Сохраняем заказ через API
                try {
                    const telegramUserId = payloadObj.uid || (message.from && message.from.id);
                    const saveOrderReq = {
                        telegram_user_id: telegramUserId,
                        orderReference: orderRef,
                        iccid: assignments?.iccid || finalOrderData.order?.[0]?.esims?.[0]?.iccid || null,
                        matchingId: assignments?.matchingId || null,
                        smdpAddress: assignments?.smdpAddress || null,
                        country_code: payloadObj.cc || null,
                        country_name: payloadObj.cn || null,
                        plan_id: payloadObj.pid || null,
                        plan_type: payloadObj.pt || null,
                        bundle_name: payloadObj.bn || null,
                        price: finalOrderData.total || orderData.total || null,
                        currency: finalOrderData.currency || orderData.currency || 'USD',
                        status: finalOrderData.status || orderData.status || 'completed',
                        createdAt: new Date().toISOString(),
                        // Новые обязательные поля
                        source: 'telegram_mini_app',
                        customer: telegramUserId,
                        provider_product_id: payloadObj.bn || null,
                        provider_base_price_usd: payloadObj.bp || finalOrderData.basePrice || orderData.basePrice || null,
                        payment_method: 'telegram_stars',
                        // Дополнительные данные из eSIMgo
                        order_status: finalOrderData.status || orderData.status,
                        order_total: finalOrderData.total || orderData.total,
                        order_currency: finalOrderData.currency || orderData.currency,
                        order_date: finalOrderData.date || finalOrderData.createdAt || new Date().toISOString()
                    };
                    
                    // Вызываем API для сохранения заказа
                    const saveOrderRes = createMockRes();
                    const saveOrderHandler = require('../orders');
                    await Promise.resolve(saveOrderHandler(createMockReq(saveOrderReq), saveOrderRes));
                    
                    if (saveOrderRes.statusCode === 200) {
                        console.log('✅ Order saved to database:', orderRef);
                    } else {
                        console.warn('⚠️ Failed to save order to database:', saveOrderRes.data);
                    }
                } catch (saveError) {
                    console.error('❌ Error saving order to database:', saveError);
                    // Не критично, продолжаем
                }
                
                // Формируем сообщение для пользователя
                let messageText = [
                    '✅ <b>Оплата через Stars успешно</b>',
                    `План: ${payloadObj.pid || 'N/A'}`,
                    `Страна: ${payloadObj.cc || payloadObj.cn || 'N/A'}`,
                    `Заказ: <code>${orderRef}</code>`
                ];
                
                if (assignments && assignments.iccid) {
                    messageText.push('');
                    messageText.push('📱 <b>eSIM готов к использованию!</b>');
                    messageText.push(`ICCID: <code>${assignments.iccid}</code>`);
                    messageText.push('');
                    messageText.push('Откройте раздел "My eSIMs" в приложении для получения QR кода.');
                } else {
                    messageText.push('');
                    messageText.push('eSIM обрабатывается. Проверьте раздел "My eSIMs" через несколько минут.');
                }
                
                await sendStatusMessage(message.chat.id, messageText.join('\n'));
            } else {
                await sendStatusMessage(message.chat.id, [
                    '⚠️ Оплата прошла, но заказ не создан.',
                    'Мы уже разбираемся. Пожалуйста, свяжитесь с поддержкой.',
                    `Платёж: <code>${paymentId}</code>`
                ].join('\n'));
            }
        } catch (error) {
            console.error('❌ Error creating order after payment:', error);
            await sendStatusMessage(message.chat.id, [
                '⚠️ Оплата прошла, но произошла ошибка при создании заказа.',
                'Мы уже разбираемся. Пожалуйста, свяжитесь с поддержкой.',
                `Платёж: <code>${paymentId}</code>`
            ].join('\n'));
        }

        return res.status(200).json({ ok: true });
    }

    // Прочие обновления нам не интересны
    return res.status(200).json({ ok: true });
};
