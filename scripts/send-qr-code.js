#!/usr/bin/env node
/**
 * Скрипт для ручной отправки QR-кода пользователю
 * Использование: node scripts/send-qr-code.js <orderReference> [telegram_user_id]
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs').promises;
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');

async function sendQRCode(orderReference, telegramUserId = null) {
    if (!BOT_TOKEN) {
        console.error('❌ TELEGRAM_BOT_TOKEN not set');
        process.exit(1);
    }
    
    try {
        // Загружаем заказы
        const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
        const allOrders = JSON.parse(ordersData);
        
        // Ищем заказ
        let order = null;
        if (telegramUserId) {
            const userOrders = allOrders[telegramUserId] || [];
            order = userOrders.find(o => o.orderReference === orderReference);
        } else {
            // Ищем во всех заказах
            for (const userId in allOrders) {
                const userOrders = allOrders[userId] || [];
                const found = userOrders.find(o => o.orderReference === orderReference);
                if (found) {
                    order = found;
                    telegramUserId = userId;
                    break;
                }
            }
        }
        
        if (!order) {
            console.error('❌ Order not found:', orderReference);
            process.exit(1);
        }
        
        if (!order.iccid && !order.matchingId) {
            console.error('❌ eSIM data not found in order');
            process.exit(1);
        }
        
        console.log('📱 Sending QR code to user:', telegramUserId);
        console.log('📦 Order:', orderReference);
        console.log('📋 ICCID:', order.iccid);
        
        // Формируем сообщение
        let message = `📱 <b>Your eSIM data:</b>\n\n`;
        if (order.iccid) message += `ICCID: <code>${order.iccid}</code>\n`;
        if (order.matchingId) message += `Matching ID: <code>${order.matchingId}</code>\n`;
        if (order.smdpAddress) message += `RSP URL: <code>${order.smdpAddress}</code>\n`;
        
        // Отправляем текстовое сообщение
        const textResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: telegramUserId,
                text: message,
                parse_mode: 'HTML'
            })
        });
        
        const textData = await textResponse.json();
        
        if (!textData.ok) {
            console.error('❌ Failed to send message:', textData);
            process.exit(1);
        }
        
        console.log('✅ Message sent successfully');
        
        // Отправляем QR код, если есть
        const qrCode = order.qrCode || order.qr_code;
        if (qrCode) {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const photoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: telegramUserId,
                    photo: qrCode,
                    caption: 'QR code for eSIM activation'
                })
            });
            
            const photoData = await photoResponse.json();
            
            if (photoData.ok) {
                console.log('✅ QR code photo sent successfully');
            } else {
                console.warn('⚠️ Failed to send QR code photo:', photoData);
            }
        } else {
            console.warn('⚠️ No QR code in order');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Получаем аргументы командной строки
const orderReference = process.argv[2];
const telegramUserId = process.argv[3] || null;

if (!orderReference) {
    console.error('Usage: node scripts/send-qr-code.js <orderReference> [telegram_user_id]');
    process.exit(1);
}

sendQRCode(orderReference, telegramUserId);
