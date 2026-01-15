/**
 * Скрипт для восстановления заказа из eSIM Go и отправки QR кода пользователю
 * 
 * Использование:
 * node scripts/restore-order-and-send-qr.js <orderReference> [telegramUserId]
 * 
 * Пример:
 * node scripts/restore-order-and-send-qr.js aa73ec03-4bf2-4753-b6a3-17e0aca54eea 123456789
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
        
        console.log('✅ Message sent successfully');
        
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
                console.log('✅ QR code photo sent successfully');
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
 * Восстановить заказ и отправить QR код
 */
async function restoreOrderAndSendQR(orderReference, telegramUserId = null) {
    try {
        console.log(`\n🔍 Восстанавливаю заказ ${orderReference} из eSIMgo...`);
        
        // Получаем статус заказа из eSIMgo
        const orderData = await esimgoClient.getOrderStatus(orderReference);
        
        console.log('✅ Данные заказа получены:', {
            orderReference: orderData.orderReference,
            status: orderData.status,
            total: orderData.total,
            currency: orderData.currency
        });
        
        // Получаем assignments если заказ завершен
        let assignments = null;
        if (orderData.status === 'completed') {
            try {
                assignments = await esimgoClient.getESIMAssignments(orderReference, 'qrCode');
                console.log('✅ Assignments получены:', {
                    hasIccid: !!assignments?.iccid,
                    hasMatchingId: !!assignments?.matchingId,
                    hasSmdpAddress: !!assignments?.smdpAddress,
                    hasQrCode: !!(assignments?.qrCode || assignments?.qr_code)
                });
            } catch (assignError) {
                console.warn('⚠️ Не удалось получить assignments:', assignError.message);
            }
        }
        
        // Извлекаем данные из заказа
        const bundleName = orderData.order?.[0]?.item || null;
        const esimData = orderData.order?.[0]?.esims?.[0] || null;
        
        // Если telegram_user_id не указан, пытаемся найти его в существующих заказах
        let finalTelegramUserId = telegramUserId;
        if (!finalTelegramUserId) {
            const allOrders = await loadOrders();
            for (const userId in allOrders) {
                const userOrders = allOrders[userId] || [];
                const existingOrder = userOrders.find(o => o.orderReference === orderReference);
                if (existingOrder) {
                    finalTelegramUserId = userId;
                    console.log(`✅ Найден существующий заказ для пользователя: ${userId}`);
                    break;
                }
            }
        }
        
        if (!finalTelegramUserId) {
            console.error('❌ Telegram User ID не найден. Укажите его вручную:');
            console.log('   node scripts/restore-order-and-send-qr.js <orderReference> <telegramUserId>');
            process.exit(1);
        }
        
        // Формируем данные заказа для сохранения
        const orderToSave = {
            orderReference: orderReference,
            number: orderReference,
            source: 'telegram_mini_app',
            customer: finalTelegramUserId,
            provider_product_id: bundleName,
            provider_base_price_usd: orderData.basePrice || null,
            payment_method: 'telegram_stars',
            date: orderData.date || new Date().toISOString().split('T')[0],
            time: new Date().toISOString(),
            status: orderData.status === 'completed' ? 'completed' : 'on_hold',
            // eSIM данные
            iccid: assignments?.iccid || esimData?.iccid || null,
            matchingId: assignments?.matchingId || esimData?.matchingId || null,
            smdpAddress: assignments?.smdpAddress || esimData?.smdpAddress || null,
            qrCode: assignments?.qrCode || assignments?.qr_code || esimData?.qrCode || null,
            qr_code: assignments?.qrCode || assignments?.qr_code || esimData?.qrCode || null,
            // Цены
            price: orderData.total || null,
            currency: orderData.currency || 'USD',
            // Статусы
            payment_status: 'succeeded',
            payment_confirmed: true,
            esim_issued: !!(assignments?.iccid || assignments?.matchingId || esimData?.iccid),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Сохраняем заказ
        const allOrders = await loadOrders();
        if (!allOrders[finalTelegramUserId]) {
            allOrders[finalTelegramUserId] = [];
        }
        
        // Проверяем, есть ли уже такой заказ
        const existingIndex = allOrders[finalTelegramUserId].findIndex(o => 
            o.orderReference === orderReference
        );
        
        if (existingIndex !== -1) {
            // Обновляем существующий заказ
            allOrders[finalTelegramUserId][existingIndex] = {
                ...allOrders[finalTelegramUserId][existingIndex],
                ...orderToSave,
                createdAt: allOrders[finalTelegramUserId][existingIndex].createdAt || orderToSave.createdAt
            };
            console.log('✅ Заказ обновлен в базе данных');
        } else {
            // Добавляем новый заказ
            allOrders[finalTelegramUserId].push(orderToSave);
            console.log('✅ Заказ добавлен в базу данных');
        }
        
        await saveOrders(allOrders);
        
        // Отправляем сообщение в Telegram
        if (assignments && (assignments.iccid || assignments.matchingId)) {
            let message = `📱 <b>Your eSIM data:</b>\n\n`;
            if (assignments.iccid) {
                message += `ICCID: <code>${assignments.iccid}</code>\n`;
            }
            if (assignments.matchingId) {
                message += `Matching ID: <code>${assignments.matchingId}</code>\n`;
            }
            if (assignments.smdpAddress) {
                message += `RSP URL: <code>${assignments.smdpAddress}</code>\n`;
            }
            
            const qrCode = assignments.qrCode || assignments.qr_code;
            const sent = await sendTelegramMessage(finalTelegramUserId, message, qrCode);
            
            if (sent) {
                console.log('✅ Сообщение с QR кодом отправлено пользователю');
            } else {
                console.warn('⚠️ Не удалось отправить сообщение');
            }
        } else {
            console.warn('⚠️ eSIM данные не готовы. Заказ сохранен, но QR код не отправлен.');
            console.log('   Попробуйте запустить скрипт позже, когда eSIM будет активирована.');
        }
        
        console.log('\n✅ Готово!');
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        process.exit(1);
    }
}

// Получаем аргументы командной строки
const orderReference = process.argv[2];
const telegramUserId = process.argv[3] || null;

if (!orderReference) {
    console.error('❌ Укажите orderReference:');
    console.log('   node scripts/restore-order-and-send-qr.js <orderReference> [telegramUserId]');
    process.exit(1);
}

restoreOrderAndSendQR(orderReference, telegramUserId);
