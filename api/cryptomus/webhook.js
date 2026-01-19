/**
 * Cryptomus webhook handler
 * Endpoint: POST /api/cryptomus/webhook
 *
 * Обрабатывает webhook уведомления от Cryptomus о статусе платежа.
 * При успешной оплате создаёт заказ через eSIM Go API и отправляет пользователю статус.
 */

const cryptomusClient = require('../_lib/cryptomus/client');
const createOrderHandler = require('../esimgo/order');

// Идемпотентность на время жизни процесса
const processedPayments = new Set();

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
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
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

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        console.warn('⚠️ Invalid method in Cryptomus webhook:', req.method);
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Сразу отвечаем Cryptomus, чтобы не было таймаута
    res.status(200).json({ success: true });

    try {
        const webhookData = req.body;

        console.log('📥 Cryptomus webhook received:', {
            type: webhookData.type,
            order_id: webhookData.order_id,
            status: webhookData.status,
            is_final: webhookData.is_final,
            amount: webhookData.amount
        });

        // Проверяем подпись
        const signature = webhookData.sign;
        if (!cryptomusClient.verifyWebhookSignature(webhookData, signature)) {
            console.error('❌ Invalid webhook signature');
            return;
        }

        // Проверяем, что это финальный статус и платеж оплачен
        if (webhookData.status !== 'paid' || !webhookData.is_final) {
            console.log('ℹ️ Payment not final or not paid yet:', {
                status: webhookData.status,
                is_final: webhookData.is_final
            });
            return;
        }

        // Проверяем на дубликаты
        const paymentId = webhookData.uuid || webhookData.order_id;
        if (processedPayments.has(paymentId)) {
            console.log('⚠️ Duplicate payment detected:', paymentId);
            return;
        }
        processedPayments.add(paymentId);

        // Извлекаем order_id и находим заказ on_hold
        const orderId = webhookData.order_id;
        if (!orderId || !orderId.startsWith('cryptomus_')) {
            console.error('❌ Invalid order_id in webhook:', orderId);
            return;
        }

        // Загружаем заказ из базы данных
        const fs = require('fs').promises;
        const path = require('path');
        const ORDERS_FILE = path.join(__dirname, '..', '..', 'data', 'orders.json');
        
        let allOrders = {};
        try {
            const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
            allOrders = JSON.parse(ordersData);
        } catch (error) {
            console.error('❌ Error loading orders:', error);
            return;
        }

        let existingOrder = null;
        let telegramUserId = null;

        // Ищем заказ по payment_session_id
        for (const userId in allOrders) {
            if (!Array.isArray(allOrders[userId])) continue;
            
            existingOrder = allOrders[userId].find(o => 
                o.payment_session_id === orderId ||
                o.orderReference === `pending_${orderId}`
            );
            
            if (existingOrder) {
                telegramUserId = userId;
                break;
            }
        }

        if (!existingOrder) {
            console.error('❌ Order not found:', orderId);
            return;
        }

        console.log('✅ Found existing order:', {
            orderReference: existingOrder.orderReference,
            telegram_user_id: telegramUserId,
            iccid: existingOrder.iccid || 'NEW ESIM',
            isExtendMode: !!existingOrder.iccid
        });

        // ✅ КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ для Extend flow
        console.log('[Cryptomus Webhook] 🔍 EXTEND FLOW CHECK - Extracting iccid for order creation:', {
            iccidFromExistingOrder: existingOrder.iccid || 'NOT FOUND IN EXISTING ORDER',
            finalIccid: existingOrder.iccid || 'NULL - WILL CREATE NEW ESIM',
            isExtendMode: !!existingOrder.iccid,
            willExtendExistingESim: !!existingOrder.iccid,
            bundle_name: existingOrder.bundle_name || 'MISSING',
            telegram_user_id: telegramUserId
        });

        // Создаем заказ в eSIM Go
        const orderReq = createMockReq({
            bundle_name: existingOrder.bundle_name,
            telegram_user_id: telegramUserId,
            telegram_username: existingOrder.telegram_username,
            iccid: existingOrder.iccid && existingOrder.iccid.trim() !== '' ? existingOrder.iccid.trim() : null, // для extend mode
            country_code: existingOrder.country_code,
            country_name: existingOrder.country_name,
            plan_id: existingOrder.plan_id,
            plan_type: existingOrder.plan_type,
            test_mode: false
        });

        console.log('[Cryptomus Webhook] 📤 Creating order with data:', {
            bundle_name: existingOrder.bundle_name,
            iccid: existingOrder.iccid,
            hasIccid: !!existingOrder.iccid,
            country_code: existingOrder.country_code,
            country_name: existingOrder.country_name
        });

        const orderRes = createMockRes();

        try {
            await Promise.resolve(createOrderHandler(orderReq, orderRes));

            const success = orderRes.statusCode === 200 && orderRes.data && orderRes.data.success;

            if (success) {
                const orderData = orderRes.data.data;
                const orderRef = orderData.orderReference || orderData.reference || 'order created';
                let assignments = orderData.assignments || null;
                
                // Получаем полные данные заказа из eSIMgo API
                let fullOrderData = null;
                if (orderRef) {
                    try {
                        const esimgoClient = require('../../_lib/esimgo/client');
                        // Ждем немного, чтобы заказ был полностью обработан
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        
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
                            let attempts = 0;
                            const maxAttempts = 3;
                            while (!assignments && attempts < maxAttempts) {
                                try {
                                    attempts++;
                                    if (attempts > 1) {
                                        console.log(`🔄 Retry ${attempts}/${maxAttempts} getting assignments...`);
                                        await new Promise(resolve => setTimeout(resolve, 2000));
                                    }
                                    assignments = await esimgoClient.getESIMAssignments(orderRef, 'qrCode');
                                    console.log('✅ Assignments retrieved from API:', {
                                        hasIccid: !!assignments?.iccid,
                                        hasMatchingId: !!assignments?.matchingId,
                                        hasQrCode: !!(assignments?.qrCode || assignments?.qr_code),
                                        attempt: attempts
                                    });
                                    break;
                                } catch (assignError) {
                                    console.warn(`⚠️ Failed to get assignments (attempt ${attempts}/${maxAttempts}):`, assignError.message);
                                    if (attempts >= maxAttempts) {
                                        console.warn('⚠️ All attempts to get assignments failed');
                                    }
                                }
                            }
                        }
                    } catch (orderStatusError) {
                        console.warn('⚠️ Failed to get full order data from eSIMgo:', orderStatusError.message);
                    }
                }
                
                // Используем полные данные из eSIMgo, если они доступны
                const finalOrderData = fullOrderData || orderData;
                
                // Если assignments все еще нет, пытаемся получить из сохраненного заказа
                if (!assignments) {
                    try {
                        const userOrders = allOrders[telegramUserId] || [];
                        const savedOrder = userOrders.find(o => 
                            o.orderReference === orderRef || 
                            o.orderReference === orderData.orderReference
                        );
                        
                        if (savedOrder && (savedOrder.iccid || savedOrder.matchingId)) {
                            assignments = {
                                iccid: savedOrder.iccid,
                                matchingId: savedOrder.matchingId,
                                smdpAddress: savedOrder.smdpAddress,
                                qrCode: savedOrder.qrCode || savedOrder.qr_code
                            };
                            console.log('✅ Assignments retrieved from saved order');
                        }
                    } catch (loadError) {
                        console.warn('⚠️ Failed to load assignments from saved order:', loadError.message);
                    }
                }
                
                // Проверяем, выдана ли eSIM
                const hasEsim = !!(assignments?.iccid || assignments?.matchingId || 
                                  finalOrderData.order?.[0]?.esims?.[0]?.iccid);
                
                // Определяем финальный статус
                let finalStatus = 'on_hold';
                if (success && hasEsim) {
                    finalStatus = 'completed';
                } else if (success && !hasEsim) {
                    finalStatus = 'on_hold';
                    console.warn('⚠️ Payment confirmed but eSIM not issued yet. Keeping status on_hold.');
                }
                
                // Сохраняем заказ через API
                try {
                    const finalOrderReference = existingOrder && existingOrder.orderReference?.startsWith('pending_') 
                        ? orderRef
                        : orderRef;
                    
                    // Определяем тип заказа
                    let orderType = existingOrder?.type || null;
                    if (!orderType) {
                        const countryCode = existingOrder.country_code || null;
                        const countryName = existingOrder.country_name || null;
                        
                        if (countryCode === 'GLOBAL' || countryName?.toLowerCase() === 'global') {
                            orderType = 'global';
                        } else if (countryCode && ['AFRICA', 'ASIA', 'EUROPE', 'LATAM', 'NA', 'BALKANAS', 'CIS', 'OCEANIA', 'REGION'].includes(countryCode.toUpperCase())) {
                            orderType = 'region';
                        } else if (countryCode && countryCode.length === 2) {
                            orderType = 'country';
                        } else {
                            orderType = 'country';
                        }
                    }
                    
                    // ✅ Генерируем QR код, если его нет, но есть matchingId и smdpAddress
                    let qrCode = assignments?.qrCode || assignments?.qr_code;
                    if (!qrCode && assignments?.matchingId && assignments?.smdpAddress) {
                        const lpaString = `LPA:1$${assignments.smdpAddress}$${assignments.matchingId}`;
                        qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lpaString)}`;
                    }
                    
                    const saveOrderReq = {
                        telegram_user_id: telegramUserId,
                        orderReference: finalOrderReference,
                        iccid: assignments?.iccid || null,
                        matchingId: assignments?.matchingId || null,
                        smdpAddress: assignments?.smdpAddress || null,
                        qrCode: qrCode,
                        country_code: existingOrder.country_code,
                        country_name: existingOrder.country_name,
                        plan_id: existingOrder.plan_id,
                        plan_type: existingOrder.plan_type,
                        bundle_name: existingOrder.bundle_name,
                        price: existingOrder.finalPrice || existingOrder.price,
                        finalPrice: existingOrder.finalPrice || existingOrder.price,
                        currency: existingOrder.currency || 'USD',
                        status: finalStatus,
                        type: orderType,
                        payment_method: 'cryptomus',
                        payment_session_id: orderId,
                        payment_status: 'succeeded',
                        payment_confirmed: true,
                        esim_issued: hasEsim,
                        createdAt: existingOrder.createdAt,
                        updatedAt: new Date().toISOString()
                    };
                    
                    // Если обновляем существующий заказ, удаляем старый pending
                    if (existingOrder && existingOrder.orderReference?.startsWith('pending_')) {
                        try {
                            const userOrders = allOrders[telegramUserId] || [];
                            const oldIndex = userOrders.findIndex(o => o.orderReference === existingOrder.orderReference);
                            if (oldIndex >= 0) {
                                userOrders.splice(oldIndex, 1);
                                allOrders[telegramUserId] = userOrders;
                                await fs.writeFile(ORDERS_FILE, JSON.stringify(allOrders, null, 2), 'utf8');
                                console.log('✅ Removed old pending order:', existingOrder.orderReference);
                            }
                        } catch (removeError) {
                            console.warn('⚠️ Failed to remove old pending order:', removeError.message);
                        }
                    }
                    
                    const ordersHandler = require('../orders');
                    const saveOrderRes = createMockRes();
                    await Promise.resolve(ordersHandler(createMockReq(saveOrderReq), saveOrderRes));
                    
                    if (saveOrderRes.statusCode === 200) {
                        console.log('✅ Order updated in database:', {
                            orderReference: orderRef,
                            status: finalStatus,
                            hasEsim: hasEsim
                        });
                    } else {
                        console.warn('⚠️ Failed to save order to database:', saveOrderRes.data);
                    }
                } catch (saveError) {
                    console.error('❌ Error saving order to database:', saveError);
                }
                
                // Отправляем сообщение об успешной оплате
                const paymentMessage = [
                    '✅ <b>Payment with Cryptomus successful</b>',
                    `Plan: ${existingOrder.plan_id || 'N/A'}`,
                    `Country: ${existingOrder.country_code || existingOrder.country_name || 'N/A'}`,
                    `Order: <code>${orderRef}</code>`
                ].join('\n');
                
                await sendStatusMessage(telegramUserId, paymentMessage);
                
                // Если есть данные eSIM, отправляем отдельное сообщение с данными eSIM/QR
                if (assignments && (assignments.iccid || assignments.matchingId)) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
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
                    
                    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
                    if (BOT_TOKEN) {
                        try {
                            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    chat_id: telegramUserId,
                                    text: esimMessage,
                                    parse_mode: 'HTML'
                                })
                            });
                            
                            // Отправляем QR код если есть
                            const qrCode = assignments.qrCode || assignments.qr_code;
                            if (qrCode) {
                                await new Promise(resolve => setTimeout(resolve, 500));
                                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        chat_id: telegramUserId,
                                        photo: qrCode,
                                        caption: 'QR code for eSIM activation'
                                    })
                                });
                            }
                        } catch (esimError) {
                            console.error('❌ Error sending eSIM data message:', esimError);
                        }
                    }
                } else {
                    console.log('⚠️ eSIM data not ready, sending processing message');
                    await sendStatusMessage(telegramUserId, 'eSIM is being processed. Please check back in a few minutes.');
                }
            } else {
                console.error('❌ Failed to create order in eSIM Go');
                await sendStatusMessage(telegramUserId, [
                    '⚠️ Payment received, but order was not created.',
                    'We are already investigating. Please contact support.',
                    `Payment ID: <code>${paymentId}</code>`
                ].join('\n'));
            }
        } catch (error) {
            console.error('❌ Error creating order after payment:', error);
            await sendStatusMessage(telegramUserId, [
                '⚠️ Payment received, but an error occurred during order creation.',
                'We are already investigating. Please contact support.',
                `Payment ID: <code>${paymentId}</code>`
            ].join('\n'));
        }

    } catch (error) {
        console.error('❌ Error processing Cryptomus webhook:', error);
    }
};
