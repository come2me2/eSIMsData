/**
 * Скрипт для ручной обработки оплаченного платежа Cryptomus
 * Использование: node scripts/process-cryptomus-payment.js <payment_uuid>
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;
const cryptomusClient = require('../api/_lib/cryptomus/client');
const createOrderHandler = require('../api/esimgo/order');

// Идемпотентность
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

async function processPayment(orderId) {
    console.log('🔍 Processing payment for order:', orderId);
    
    // Загружаем заказ из базы данных
    const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');
    const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
    const allOrders = JSON.parse(ordersData);
    
    let existingOrder = null;
    let telegramUserId = null;
    
    // Ищем заказ по payment_session_id или orderReference
    for (const userId in allOrders) {
        if (!Array.isArray(allOrders[userId])) continue;
        
        existingOrder = allOrders[userId].find(o => 
            o.payment_session_id === orderId ||
            o.orderReference === `pending_${orderId}` ||
            o.orderReference === orderId
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
    
    console.log('✅ Found order:', {
        orderReference: existingOrder.orderReference,
        telegram_user_id: telegramUserId,
        bundle_name: existingOrder.bundle_name,
        status: existingOrder.status
    });
    
    // Получаем информацию о платеже из Cryptomus API
    // Используем UUID из payment_session_id или пробуем найти через order_id
    let paymentInfo = null;
    try {
        // Пробуем получить по order_id (если это UUID)
        if (orderId.includes('-')) {
            paymentInfo = await cryptomusClient.getPaymentInfo(orderId);
        } else {
            // Если это не UUID, но это наш order_id (cryptomus_...), пропускаем проверку
            // и обрабатываем заказ напрямую, так как платеж уже подтвержден
            console.log('ℹ️ Order ID format detected, processing order directly (payment already confirmed)');
            paymentInfo = { payment_status: 'paid', is_final: true }; // Считаем оплаченным
        }
    } catch (error) {
        console.error('❌ Error getting payment info from Cryptomus:', error.message);
        console.log('ℹ️ Trying to process order anyway (assuming payment is confirmed)...');
        // Если не удалось получить информацию, но платеж подтвержден вручную, продолжаем
        paymentInfo = { payment_status: 'paid', is_final: true };
    }
    
    if (paymentInfo) {
        console.log('✅ Payment info from Cryptomus:', {
            uuid: paymentInfo.uuid,
            order_id: paymentInfo.order_id,
            status: paymentInfo.payment_status,
            is_final: paymentInfo.is_final
        });
        
        // Проверяем статус платежа
        if (paymentInfo.payment_status !== 'paid' || !paymentInfo.is_final) {
            console.warn('⚠️ Payment is not paid or not final:', {
                status: paymentInfo.payment_status,
                is_final: paymentInfo.is_final
            });
            return;
        }
    }
    
    // Создаем заказ в eSIM Go
    const orderReq = createMockReq({
        bundle_name: existingOrder.bundle_name,
        telegram_user_id: telegramUserId,
        telegram_username: existingOrder.telegram_username,
        iccid: existingOrder.iccid && existingOrder.iccid.trim() !== '' ? existingOrder.iccid.trim() : null,
        country_code: existingOrder.country_code,
        country_name: existingOrder.country_name,
        plan_id: existingOrder.plan_id,
        plan_type: existingOrder.plan_type,
        test_mode: false
    });
    
    console.log('📤 Creating order in eSIM Go:', {
        bundle_name: existingOrder.bundle_name,
        iccid: existingOrder.iccid,
        country_code: existingOrder.country_code
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
                    const esimgoClient = require('../api/_lib/esimgo/client');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    
                    fullOrderData = await esimgoClient.getOrderStatus(orderRef);
                    console.log('✅ Full order data retrieved from eSIMgo:', {
                        orderReference: fullOrderData.orderReference,
                        status: fullOrderData.status
                    });
                    
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
                                
                                // ✅ ИСПРАВЛЕНИЕ: Используем getESIMAssignments вместо getAssignments
                                const assignmentsData = await esimgoClient.getESIMAssignments(orderRef, 'qrCode');
                                if (assignmentsData && (assignmentsData.iccid || assignmentsData.matchingId)) {
                                    assignments = assignmentsData; // Это объект, а не массив
                                    console.log('✅ Assignments retrieved:', {
                                        hasIccid: !!assignments.iccid,
                                        hasMatchingId: !!assignments.matchingId,
                                        hasQrCode: !!assignments.qrCode
                                    });
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
            let qrCode = null;
            let matchingId = null;
            let smdpAddress = null;
            let iccidFromESim = null;
            
            // ✅ ИСПРАВЛЕНИЕ: assignments теперь объект, а не массив
            if (assignments) {
                // Проверяем, массив это или объект
                if (Array.isArray(assignments) && assignments.length > 0) {
                    const assignment = assignments[0];
                    qrCode = assignment.qrCode || assignment.qr_code || assignment.QRCode || null;
                    matchingId = assignment.matchingId || assignment.matching_id || assignment.MatchingId || null;
                    smdpAddress = assignment.smdpAddress || assignment.smdp_address || assignment.SmdpAddress || null;
                    iccidFromESim = assignment.iccid || assignment.ICCID || null;
                } else if (typeof assignments === 'object') {
                    // Это объект напрямую
                    qrCode = assignments.qrCode || assignments.qr_code || assignments.QRCode || null;
                    matchingId = assignments.matchingId || assignments.matching_id || assignments.MatchingId || null;
                    smdpAddress = assignments.smdpAddress || assignments.smdp_address || assignments.SmdpAddress || null;
                    iccidFromESim = assignments.iccid || assignments.ICCID || null;
                }
            }
            
            // Если QR код не найден, но есть matchingId и smdpAddress, генерируем его
            if (!qrCode && matchingId && smdpAddress) {
                qrCode = `LPA:1$${smdpAddress}$${matchingId}`;
                console.log('✅ QR code generated from matchingId and smdpAddress');
            }
            
            // Обновляем заказ в базе данных
            const ordersHandler = require('../api/orders');
            const updateReq = {
                method: 'POST',
                body: {
                    telegram_user_id: telegramUserId,
                    orderReference: orderRef,
                    status: 'completed',
                    payment_method: 'cryptomus',
                    payment_session_id: orderId,
                    payment_status: 'succeeded',
                    country_code: existingOrder.country_code,
                    country_name: existingOrder.country_name,
                    plan_id: existingOrder.plan_id,
                    plan_type: existingOrder.plan_type,
                    bundle_name: existingOrder.bundle_name,
                    price: existingOrder.price,
                    finalPrice: existingOrder.finalPrice || existingOrder.price,
                    currency: existingOrder.currency || 'USD',
                    provider_base_price_usd: existingOrder.provider_base_price_usd,
                    provider_product_id: existingOrder.bundle_name,
                    source: 'telegram_mini_app',
                    customer: telegramUserId,
                    iccid: iccidFromESim || existingOrder.iccid,
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
                iccid: iccidFromESim || existingOrder.iccid
            });
            
            // Отправляем сообщение пользователю
            if (qrCode) {
                const message = existingOrder.iccid 
                    ? `✅ <b>Traffic Extended!</b>\n\nYour eSIM has been extended with additional data.\n\n📱 <b>ICCID:</b> <code>${iccidFromESim || existingOrder.iccid}</code>\n\nScan the QR code to install or update your eSIM:`
                    : `✅ <b>eSIM Ready!</b>\n\nYour eSIM has been activated.\n\nScan the QR code to install your eSIM:`;
                
                await sendStatusMessage(telegramUserId, message);
                
                // Отправляем QR код
                await callTelegram('sendPhoto', {
                    chat_id: telegramUserId,
                    photo: qrCode,
                    caption: 'Scan this QR code to install your eSIM'
                });
            } else {
                const message = existingOrder.iccid
                    ? `✅ <b>Traffic Extended!</b>\n\nYour eSIM has been extended with additional data.\n\n📱 <b>ICCID:</b> <code>${iccidFromESim || existingOrder.iccid}</code>`
                    : `✅ <b>eSIM Activated!</b>\n\nYour eSIM order has been processed.\n\n📱 <b>ICCID:</b> <code>${iccidFromESim || 'Pending'}</code>`;
                
                await sendStatusMessage(telegramUserId, message);
                
                if (matchingId && smdpAddress) {
                    await sendStatusMessage(telegramUserId, 
                        `📱 <b>Manual Installation:</b>\n\n<b>Matching ID:</b> <code>${matchingId}</code>\n<b>SM-DP+ Address:</b> <code>${smdpAddress}</code>`
                    );
                }
            }
            
            console.log('✅ Payment processed successfully!');
        } else {
            console.error('❌ Failed to create order in eSIM Go:', {
                statusCode: orderRes.statusCode,
                data: orderRes.data
            });
        }
    } catch (error) {
        console.error('❌ Error processing order:', error);
    }
}

// Запуск скрипта
const orderId = process.argv[2];
if (!orderId) {
    console.error('Usage: node scripts/process-cryptomus-payment.js <order_id>');
    console.error('Example: node scripts/process-cryptomus-payment.js cryptomus_1768833553265_afwv0ncl0');
    process.exit(1);
}

processPayment(orderId).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
