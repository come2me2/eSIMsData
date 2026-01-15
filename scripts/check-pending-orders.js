/**
 * Скрипт для проверки заказов без QR кода и отправки их пользователям
 * 
 * Использование:
 * node scripts/check-pending-orders.js
 * 
 * Можно запускать через cron для периодической проверки
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs').promises;
const path = require('path');
const esimgoClient = require('../api/_lib/esimgo/client');

const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

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
        throw error;
    }
}

/**
 * Сохранить все заказы
 */
async function saveOrders(orders) {
    const dataDir = path.dirname(ORDERS_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
}

/**
 * Отправить сообщение в Telegram
 */
async function sendTelegramMessage(chatId, message, qrCode = null) {
    if (!BOT_TOKEN) {
        console.error('❌ TELEGRAM_BOT_TOKEN not set');
        return false;
    }
    
    try {
        // Отправляем текстовое сообщение
        const textResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });
        
        const textData = await textResponse.json();
        
        if (!textData.ok) {
            console.error('❌ Failed to send message:', textData);
            return false;
        }
        
        // Отправляем QR код, если есть
        if (qrCode) {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const photoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    photo: qrCode,
                    caption: 'QR code for eSIM activation'
                })
            });
            
            const photoData = await photoResponse.json();
            
            if (photoData.ok) {
                return true;
            } else {
                console.warn('⚠️ Failed to send QR code photo:', photoData);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Error sending Telegram message:', error);
        return false;
    }
}

/**
 * Проверить заказы без QR кода
 */
async function checkPendingOrders() {
    try {
        console.log('\n🔍 Проверяю заказы без QR кода...\n');
        
        const allOrders = await loadOrders();
        let checkedCount = 0;
        let updatedCount = 0;
        let sentCount = 0;
        
        for (const userId in allOrders) {
            const userOrders = allOrders[userId] || [];
            
            for (let i = 0; i < userOrders.length; i++) {
                const order = userOrders[i];
                
                // Проверяем только заказы, у которых нет QR кода или eSIM данных
                const hasQR = !!(order.qrCode || order.qr_code);
                const hasEsimData = !!(order.iccid || order.matchingId);
                const hasOrderRef = !!order.orderReference;
                
                // Пропускаем заказы, у которых уже есть QR код
                if (hasQR && hasEsimData) {
                    continue;
                }
                
                // Пропускаем заказы без orderReference
                if (!hasOrderRef) {
                    continue;
                }
                
                // Пропускаем заказы со статусом failed или canceled
                if (order.status === 'failed' || order.status === 'canceled') {
                    continue;
                }
                
                checkedCount++;
                console.log(`📦 Проверяю заказ ${order.orderReference}...`);
                
                try {
                    // Получаем статус заказа из eSIM Go
                    const orderData = await esimgoClient.getOrderStatus(order.orderReference);
                    
                    // Если заказ завершен, пытаемся получить assignments
                    if (orderData.status === 'completed') {
                        try {
                            const assignments = await esimgoClient.getESIMAssignments(order.orderReference, 'qrCode');
                            
                            if (assignments && (assignments.iccid || assignments.matchingId)) {
                                // Обновляем заказ
                                const updatedOrder = {
                                    ...order,
                                    iccid: assignments.iccid || order.iccid,
                                    matchingId: assignments.matchingId || order.matchingId,
                                    smdpAddress: assignments.smdpAddress || order.smdpAddress,
                                    qrCode: assignments.qrCode || assignments.qr_code || order.qrCode,
                                    qr_code: assignments.qrCode || assignments.qr_code || order.qr_code || order.qrCode,
                                    status: 'completed',
                                    esim_issued: true,
                                    payment_confirmed: true,
                                    updatedAt: new Date().toISOString()
                                };
                                
                                allOrders[userId][i] = updatedOrder;
                                updatedCount++;
                                
                                console.log(`  ✅ eSIM данные получены для заказа ${order.orderReference}`);
                                
                                // Отправляем сообщение пользователю, если еще не отправляли
                                // Проверяем, есть ли флаг о том, что сообщение уже отправлено
                                if (!order.esim_sent_to_user) {
                                    let message = `📱 <b>Your eSIM data:</b>\n\n`;
                                    if (updatedOrder.iccid) {
                                        message += `ICCID: <code>${updatedOrder.iccid}</code>\n`;
                                    }
                                    if (updatedOrder.matchingId) {
                                        message += `Matching ID: <code>${updatedOrder.matchingId}</code>\n`;
                                    }
                                    if (updatedOrder.smdpAddress) {
                                        message += `RSP URL: <code>${updatedOrder.smdpAddress}</code>\n`;
                                    }
                                    
                                    const qrCode = updatedOrder.qrCode || updatedOrder.qr_code;
                                    const sent = await sendTelegramMessage(userId, message, qrCode);
                                    
                                    if (sent) {
                                        updatedOrder.esim_sent_to_user = true;
                                        allOrders[userId][i] = updatedOrder;
                                        sentCount++;
                                        console.log(`  ✅ QR код отправлен пользователю ${userId}`);
                                    } else {
                                        console.warn(`  ⚠️ Не удалось отправить QR код пользователю ${userId}`);
                                    }
                                } else {
                                    console.log(`  ℹ️ QR код уже был отправлен пользователю ранее`);
                                }
                            } else {
                                console.log(`  ⚠️ Assignments не готовы для заказа ${order.orderReference}`);
                            }
                        } catch (assignError) {
                            console.warn(`  ⚠️ Не удалось получить assignments: ${assignError.message}`);
                        }
                    } else {
                        console.log(`  ℹ️ Заказ ${order.orderReference} еще не завершен (статус: ${orderData.status})`);
                    }
                    
                    // Небольшая задержка между запросами
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    console.error(`  ❌ Ошибка при проверке заказа ${order.orderReference}:`, error.message);
                }
            }
        }
        
        // Сохраняем обновленные заказы
        if (updatedCount > 0) {
            await saveOrders(allOrders);
            console.log(`\n✅ Обновлено заказов: ${updatedCount}`);
        }
        
        if (sentCount > 0) {
            console.log(`✅ Отправлено QR кодов: ${sentCount}`);
        }
        
        console.log(`\n📊 Всего проверено заказов: ${checkedCount}`);
        console.log('✅ Проверка завершена\n');
        
    } catch (error) {
        console.error('❌ Ошибка при проверке заказов:', error);
        process.exit(1);
    }
}

checkPendingOrders();
