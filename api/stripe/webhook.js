/**
 * Stripe webhook handler
 * Endpoint: POST /api/stripe/webhook
 *
 * Обрабатывает webhook уведомления от Stripe о статусе платежа.
 * При успешной оплате создаёт заказ через eSIM Go API и отправляет пользователю статус.
 */

const stripeClient = require('../_lib/stripe/client');
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
        console.warn('⚠️ Invalid method in Stripe webhook:', req.method);
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Получаем подпись из заголовка
    const signature = req.headers['stripe-signature'];
    if (!signature) {
        console.warn('⚠️ Missing stripe-signature header');
        return res.status(400).json({ success: false, error: 'Missing signature' });
    }

    // Для проверки подписи нужен raw body
    // Express.raw() middleware уже настроен в server.js для этого endpoint
    let rawBody;
    if (Buffer.isBuffer(req.body)) {
        // Если body - Buffer (от express.raw()), используем его
        rawBody = req.body.toString('utf8');
    } else if (typeof req.body === 'string') {
        rawBody = req.body;
    } else {
        // Fallback: если body уже парсится как JSON, конвертируем обратно
        rawBody = JSON.stringify(req.body);
    }

    // Проверяем подпись
    const event = stripeClient.verifyWebhookSignature(rawBody, signature);
    if (!event) {
        console.error('❌ Invalid webhook signature');
        return res.status(403).json({ success: false, error: 'Invalid signature' });
    }

    // Сразу отвечаем Stripe, чтобы не было таймаута
    res.status(200).json({ received: true });

    try {
        console.log('📥 [Stripe Webhook] Received event:', {
            type: event.type,
            eventId: event.id,
            objectId: event.data?.object?.id,
            timestamp: new Date().toISOString()
        });

        // Обрабатываем события checkout.session.completed и checkout.session.expired
        if (event.type === 'checkout.session.expired') {
            await handleExpiredSession(event.data.object);
            return;
        }

        if (event.type !== 'checkout.session.completed') {
            console.log('ℹ️ [Stripe Webhook] Ignoring event type:', event.type);
            return;
        }

        const session = event.data.object;
        
        console.log('✅ Checkout session completed:', {
            sessionId: session.id,
            paymentStatus: session.payment_status,
            amountTotal: session.amount_total,
            currency: session.currency,
            metadata: session.metadata
        });

        // Проверяем статус платежа
        if (session.payment_status !== 'paid') {
            console.log('ℹ️ Payment not paid yet:', {
                paymentStatus: session.payment_status
            });
            return;
        }

        // Проверяем на дубликаты
        const paymentId = session.id;
        if (processedPayments.has(paymentId)) {
            console.log('⚠️ Duplicate payment detected:', paymentId);
            return;
        }
        processedPayments.add(paymentId);

        // Извлекаем metadata (компактный формат)
        const metadata = session.metadata || {};
        const plan_id = metadata.p; // plan_id
        const plan_type = metadata.t; // plan_type
        const bundle_name = metadata.b; // bundle_name
        const country_code = metadata.cc; // country_code
        const country_name = metadata.cn; // country_name
        const finalPrice = metadata.fp ? parseFloat(metadata.fp) : null; // finalPrice
        const telegram_user_id = metadata.u; // telegram_user_id
        const iccid = metadata.i; // iccid (для extend mode)

        // Валидация обязательных полей
        if (!plan_id || !bundle_name || !telegram_user_id) {
            console.error('❌ Missing required metadata:', {
                plan_id: !!plan_id,
                bundle_name: !!bundle_name,
                telegram_user_id: !!telegram_user_id
            });
            return;
        }

        // Находим заказ on_hold по metadata или session.id
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
        let foundTelegramUserId = null;

        // Ищем заказ по payment_session_id или telegram_user_id + metadata
        for (const userId in allOrders) {
            if (!Array.isArray(allOrders[userId])) continue;
            
            existingOrder = allOrders[userId].find(o => 
                o.payment_session_id === session.id ||
                (o.telegram_user_id === telegram_user_id && 
                 o.bundle_name === bundle_name &&
                 o.status === 'on_hold' &&
                 o.payment_method === 'stripe')
            );
            
            if (existingOrder) {
                foundTelegramUserId = userId;
                break;
            }
        }

        if (!existingOrder) {
            console.error('❌ Order not found for session:', {
                sessionId: session.id,
                telegram_user_id: telegram_user_id,
                bundle_name: bundle_name
            });
            return;
        }

        console.log('✅ Found existing order:', {
            orderReference: existingOrder.orderReference,
            telegram_user_id: foundTelegramUserId,
            iccid: existingOrder.iccid || 'NEW ESIM',
            isExtendMode: !!existingOrder.iccid
        });

        // ✅ КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ для Extend flow
        console.log('[Stripe Webhook] 🔍 EXTEND FLOW CHECK - Extracting iccid for order creation:', {
            iccidFromMetadata: iccid || 'NOT IN METADATA',
            iccidFromExistingOrder: existingOrder.iccid || 'NOT FOUND IN EXISTING ORDER',
            finalIccid: existingOrder.iccid || iccid || 'NULL - WILL CREATE NEW ESIM',
            isExtendMode: !!(existingOrder.iccid || iccid),
            willExtendExistingESim: !!(existingOrder.iccid || iccid),
            bundle_name: bundle_name,
            telegram_user_id: foundTelegramUserId
        });

        // Используем iccid из существующего заказа или из metadata
        const finalIccid = existingOrder.iccid && existingOrder.iccid.trim() !== '' 
            ? existingOrder.iccid.trim() 
            : (iccid && iccid.trim() !== '' ? iccid.trim() : null);

        // Создаем заказ в eSIM Go
        const orderReq = createMockReq({
            bundle_name: bundle_name,
            telegram_user_id: foundTelegramUserId,
            telegram_username: existingOrder.telegram_username,
            iccid: finalIccid, // для extend mode
            country_code: country_code || existingOrder.country_code,
            country_name: country_name || existingOrder.country_name,
            plan_id: plan_id || existingOrder.plan_id,
            plan_type: plan_type || existingOrder.plan_type,
            test_mode: false
        });

        console.log('[Stripe Webhook] 📤 Creating order with data:', {
            bundle_name: bundle_name,
            iccid: finalIccid,
            hasIccid: !!finalIccid,
            country_code: country_code || existingOrder.country_code,
            country_name: country_name || existingOrder.country_name
        });

        const orderRes = createMockRes();

        // ✅ RETRY ЛОГИКА: Пытаемся создать заказ в eSIM Go с повторными попытками
        let success = false;
        let lastError = null;
        const maxRetries = 3;
        const retryDelays = [2000, 5000, 10000]; // Экспоненциальная задержка: 2s, 5s, 10s
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 [Stripe Webhook] Attempt ${attempt}/${maxRetries} to create eSIM Go order...`);
                
                // Сбрасываем response перед каждой попыткой
                orderRes.statusCode = 200;
                orderRes.data = null;
                
                await Promise.resolve(createOrderHandler(orderReq, orderRes));
                
                success = orderRes.statusCode === 200 && orderRes.data && orderRes.data.success;
                
                if (success) {
                    console.log(`✅ [Stripe Webhook] eSIM Go order created successfully on attempt ${attempt}`);
                    break;
                } else {
                    lastError = new Error(`eSIM Go returned non-success: ${orderRes.statusCode} - ${JSON.stringify(orderRes.data)}`);
                    console.warn(`⚠️ [Stripe Webhook] Attempt ${attempt} failed:`, lastError.message);
                }
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ [Stripe Webhook] Attempt ${attempt} error:`, error.message);
                
                // Если это не последняя попытка, ждем перед повтором
                if (attempt < maxRetries) {
                    const delay = retryDelays[attempt - 1] || 5000;
                    console.log(`⏳ [Stripe Webhook] Waiting ${delay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        try {
            if (success) {

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
                                    console.log('✅ [Stripe Webhook] Assignments retrieved from eSIMgo API:', {
                                        hasIccid: !!assignments?.iccid,
                                        hasMatchingId: !!assignments?.matchingId,
                                        hasQrCode: !!(assignments?.qrCode || assignments?.qr_code),
                                        attempt: attempts
                                    });
                                    if (assignments) {
                                        break;
                                    }
                                } catch (assignError) {
                                    console.error(`⚠️ Error getting assignments (attempt ${attempts}):`, assignError.message);
                                }
                            }
                        }
                    } catch (fetchError) {
                        console.error('⚠️ Error fetching full order data:', fetchError.message);
                    }
                }

                // Извлекаем данные из assignments
                // ✅ ИСПРАВЛЕНИЕ: assignments теперь объект, а не массив
                let qrCode = null;
                let matchingId = null;
                let smdpAddress = null;
                let iccidFromESim = null;
                
                if (assignments && typeof assignments === 'object') {
                    qrCode = assignments.qrCode || assignments.qr_code || assignments.QRCode || null;
                    matchingId = assignments.matchingId || assignments.matching_id || assignments.MatchingId || null;
                    smdpAddress = assignments.smdpAddress || assignments.smdp_address || assignments.SmdpAddress || null;
                    iccidFromESim = assignments.iccid || assignments.ICCID || null;
                }

                // Если QR код не найден, но есть matchingId и smdpAddress, генерируем его
                if (!qrCode && matchingId && smdpAddress) {
                    qrCode = `LPA:1$${smdpAddress}$${matchingId}`;
                    console.log('✅ QR code generated from matchingId and smdpAddress');
                }

                // Обновляем заказ в базе данных
                const ordersHandler = require('../orders');
                const updateReq = {
                    method: 'POST',
                    body: {
                        telegram_user_id: foundTelegramUserId,
                        orderReference: orderRef,
                        status: 'completed',
                        payment_method: 'stripe',
                        payment_session_id: session.id,
                        payment_status: 'succeeded',
                        country_code: country_code || existingOrder.country_code,
                        country_name: country_name || existingOrder.country_name,
                        plan_id: plan_id || existingOrder.plan_id,
                        plan_type: plan_type || existingOrder.plan_type,
                        bundle_name: bundle_name,
                        price: finalPrice || existingOrder.price,
                        finalPrice: finalPrice || existingOrder.finalPrice || existingOrder.price,
                        currency: session.currency?.toUpperCase() || existingOrder.currency || 'USD',
                        provider_base_price_usd: existingOrder.provider_base_price_usd,
                        provider_product_id: bundle_name,
                        source: 'telegram_mini_app',
                        customer: foundTelegramUserId,
                        iccid: iccidFromESim || finalIccid || existingOrder.iccid,
                        qrCode: qrCode,
                        matchingId: matchingId,
                        smdpAddress: smdpAddress,
                        createdAt: existingOrder.createdAt || new Date().toISOString(),
                        completedAt: new Date().toISOString()
                    }
                };

                const updateRes = createMockRes();
                await ordersHandler(updateReq, updateRes);

                console.log('✅ Order updated in database:', {
                    orderReference: orderRef,
                    status: 'completed',
                    iccid: iccidFromESim || finalIccid
                });

                // Отправляем сообщение пользователю
                if (qrCode) {
                    const message = finalIccid 
                        ? `✅ <b>Traffic Extended!</b>\n\nYour eSIM has been extended with additional data.\n\n📱 <b>ICCID:</b> <code>${iccidFromESim || finalIccid}</code>\n\nScan the QR code to install or update your eSIM:`
                        : `✅ <b>eSIM Ready!</b>\n\nYour eSIM has been activated.\n\nScan the QR code to install your eSIM:`;
                    
                    await sendStatusMessage(foundTelegramUserId, message);
                    
                    // Отправляем QR код
                    await callTelegram('sendPhoto', {
                        chat_id: foundTelegramUserId,
                        photo: qrCode,
                        caption: 'Scan this QR code to install your eSIM'
                    });
                } else {
                    const message = finalIccid
                        ? `✅ <b>Traffic Extended!</b>\n\nYour eSIM has been extended with additional data.\n\n📱 <b>ICCID:</b> <code>${iccidFromESim || finalIccid}</code>`
                        : `✅ <b>eSIM Activated!</b>\n\nYour eSIM order has been processed.\n\n📱 <b>ICCID:</b> <code>${iccidFromESim || 'Pending'}</code>`;
                    
                    await sendStatusMessage(foundTelegramUserId, message);
                    
                    if (matchingId && smdpAddress) {
                        await sendStatusMessage(foundTelegramUserId, 
                            `📱 <b>Manual Installation:</b>\n\n<b>Matching ID:</b> <code>${matchingId}</code>\n<b>SM-DP+ Address:</b> <code>${smdpAddress}</code>`
                        );
                    }
                }

                console.log('✅ Stripe payment processed successfully:', {
                    sessionId: session.id,
                    orderReference: orderRef,
                    telegram_user_id: foundTelegramUserId
                });
            } else {
                // Ошибка при создании заказа в eSIM Go после всех попыток
                console.error('❌ [Stripe Webhook] Failed to create order in eSIM Go after all retries. Response:', {
                    statusCode: orderRes.statusCode,
                    data: orderRes.data,
                    lastError: lastError?.message,
                    attempts: maxRetries
                });

                // Обновляем существующий заказ как оплаченный, но оставляем в on_hold
                try {
                    const userOrders = allOrders[foundTelegramUserId] || [];
                    const idx = userOrders.findIndex(o =>
                        o.orderReference === existingOrder.orderReference ||
                        o.payment_session_id === session.id
                    );
                    if (idx !== -1) {
                        const updated = {
                            ...userOrders[idx],
                            status: 'on_hold',
                            payment_status: 'succeeded',
                            payment_confirmed: true,
                            updatedAt: new Date().toISOString(),
                            esim_issued: false,
                            esim_error: (orderRes.data && orderRes.data.error) || lastError?.message || 'eSIM Go order creation failed after retries'
                        };
                        userOrders[idx] = updated;
                        allOrders[foundTelegramUserId] = userOrders;
                        await fs.writeFile(ORDERS_FILE, JSON.stringify(allOrders, null, 2), 'utf8');
                        console.log('✅ [Stripe Webhook] Marked order as paid but on_hold due to eSIM error:', {
                            orderReference: updated.orderReference,
                            payment_status: updated.payment_status,
                            status: updated.status
                        });
                    }
                } catch (updateError) {
                    console.error('❌ [Stripe Webhook] Failed to update order status after eSIM Go error:', updateError);
                }

                await sendStatusMessage(foundTelegramUserId, [
                    '⚠️ Payment with Stripe received, but there was a technical issue creating your eSIM.',
                    'Our system will retry automatically or support will process your eSIM manually.',
                    `Session ID: <code>${session.id}</code>`
                ].join('\n'));
            }
        } catch (orderError) {
            console.error('❌ Error processing order:', orderError);
            
            await sendStatusMessage(foundTelegramUserId, 
                '❌ <b>Error Processing Order</b>\n\nAn error occurred while processing your order. Please contact support.'
            );
        }
    } catch (error) {
        console.error('❌ [Stripe Webhook] Critical error while processing webhook:', error);
    }
};

/**
 * Обработка события checkout.session.expired
 * Отменяет заказ, если сессия оплаты истекла
 */
async function handleExpiredSession(session) {
    try {
        console.log('⏰ [Stripe Webhook] Checkout session expired:', {
            sessionId: session.id,
            expiresAt: session.expires_at
        });

        const fs = require('fs').promises;
        const path = require('path');
        const ORDERS_FILE = path.join(__dirname, '..', '..', 'data', 'orders.json');
        
        let allOrders = {};
        try {
            const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
            allOrders = JSON.parse(ordersData);
        } catch (error) {
            console.error('❌ [Stripe Webhook] Error loading orders for expired session:', error);
            return;
        }

        // Ищем заказ по payment_session_id
        let existingOrder = null;
        let foundTelegramUserId = null;

        for (const userId in allOrders) {
            if (!Array.isArray(allOrders[userId])) continue;
            
            existingOrder = allOrders[userId].find(o => 
                o.payment_session_id === session.id
            );
            
            if (existingOrder) {
                foundTelegramUserId = userId;
                break;
            }
        }

        if (!existingOrder) {
            console.log('ℹ️ [Stripe Webhook] Order not found for expired session:', session.id);
            return;
        }

        // Обновляем статус заказа на canceled
        const userOrders = allOrders[foundTelegramUserId] || [];
        const idx = userOrders.findIndex(o => o.orderReference === existingOrder.orderReference);
        
        if (idx !== -1) {
            const updated = {
                ...userOrders[idx],
                status: 'canceled',
                payment_status: 'expired',
                payment_confirmed: false,
                canceled_reason: 'Checkout session expired',
                updatedAt: new Date().toISOString()
            };
            userOrders[idx] = updated;
            allOrders[foundTelegramUserId] = userOrders;
            await fs.writeFile(ORDERS_FILE, JSON.stringify(allOrders, null, 2), 'utf8');
            
            console.log('✅ [Stripe Webhook] Order canceled due to expired session:', {
                orderReference: updated.orderReference,
                sessionId: session.id
            });

            // Уведомляем пользователя (опционально)
            try {
                await sendStatusMessage(foundTelegramUserId, 
                    '⏰ <b>Payment Session Expired</b>\n\nYour payment session has expired. Please try again if you still want to purchase this eSIM.'
                );
            } catch (msgError) {
                console.warn('⚠️ [Stripe Webhook] Failed to send expiration message:', msgError.message);
            }
        }
    } catch (error) {
        console.error('❌ [Stripe Webhook] Error handling expired session:', error);
    }
}
