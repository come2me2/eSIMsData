#!/usr/bin/env node

/**
 * Скрипт для восстановления всех заказов пользователя из eSIMgo
 * 
 * Использование:
 * node scripts/restore-user-orders.js <telegram_user_id> [orderReference1] [orderReference2] ...
 * 
 * Пример:
 * node scripts/restore-user-orders.js 2515644 90be519e-6720-4a75-b02d-30791bc496216 c1d0b57b-bd6d-47eb-b025-e0c9ca74c9cb
 */

const esimgoClient = require('../api/_lib/esimgo/client');
const path = require('path');
const fs = require('fs').promises;

// Загружаем переменные окружения
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');

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

async function saveOrders(orders) {
    const dataDir = path.dirname(ORDERS_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
}

async function restoreOrder(orderReference, telegramUserId) {
    try {
        console.log(`\n🔍 Восстанавливаю заказ ${orderReference}...`);
        
        // Получаем статус заказа из eSIMgo
        const orderData = await esimgoClient.getOrderStatus(orderReference);
        
        console.log(`   ✅ Статус: ${orderData.status}`);
        
        // Получаем assignments если заказ завершен
        let assignments = null;
        if (orderData.status === 'completed') {
            try {
                assignments = await esimgoClient.getESIMAssignments(orderReference);
                console.log(`   ✅ Assignments получены`);
            } catch (assignError) {
                console.warn(`   ⚠️  Не удалось получить assignments: ${assignError.message}`);
            }
        }
        
        // Формируем данные заказа
        const bundleName = orderData.order?.[0]?.item || null;
        const esimData = orderData.order?.[0]?.esims?.[0] || null;
        
        const createdAt = orderData.date || orderData.createdAt || new Date().toISOString();
        const createdAtDate = new Date(createdAt);
        const date = createdAtDate.toISOString().split('T')[0];
        const time = createdAtDate.toTimeString().split(' ')[0];
        
        const orderToSave = {
            orderReference: orderReference,
            number: orderReference,
            source: 'telegram_mini_app',
            customer: telegramUserId,
            telegram_user_id: telegramUserId,
            provider_product_id: bundleName || null,
            provider_base_price_usd: orderData.basePrice || null,
            payment_method: 'telegram_stars',
            paymentType: 'telegram_stars',
            date: date,
            time: time,
            status: orderData.status || 'completed',
            iccid: assignments?.iccid || esimData?.iccid || null,
            matchingId: assignments?.matchingId || null,
            smdpAddress: assignments?.smdpAddress || null,
            rspUrl: assignments?.smdpAddress || null,
            country_code: null,
            country_name: null,
            plan_id: null,
            plan_type: null,
            plan_name: null,
            bundle_name: bundleName || null,
            price: orderData.total || null,
            currency: orderData.currency || 'USD',
            createdAt: createdAt,
            updatedAt: new Date().toISOString()
        };
        
        // Генерируем QR код если есть matchingId
        if (orderToSave.matchingId && orderToSave.smdpAddress) {
            const smdpDomain = orderToSave.smdpAddress.replace(/^https?:\/\//, '').split('/')[0];
            orderToSave.qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=LPA:1$${smdpDomain}$${orderToSave.matchingId}`;
            orderToSave.qr_code = orderToSave.qrCode;
        }
        
        return orderToSave;
        
    } catch (error) {
        console.error(`   ❌ Ошибка при восстановлении заказа ${orderReference}:`, error.message);
        throw error;
    }
}

async function restoreUserOrders(telegramUserId, orderReferences) {
    try {
        console.log(`\n📦 Восстановление заказов для пользователя ${telegramUserId}`);
        console.log(`   Найдено заказов: ${orderReferences.length}`);
        
        // Загружаем существующие заказы
        const orders = await loadOrders();
        
        if (!orders[telegramUserId]) {
            orders[telegramUserId] = [];
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        // Восстанавливаем каждый заказ
        for (const orderReference of orderReferences) {
            try {
                const orderToSave = await restoreOrder(orderReference, telegramUserId);
                
                // Проверяем, нет ли уже такого заказа
                const existingIndex = orders[telegramUserId].findIndex(
                    o => o.orderReference === orderReference || o.number === orderReference
                );
                
                if (existingIndex >= 0) {
                    console.log(`   🔄 Обновляю существующий заказ...`);
                    orders[telegramUserId][existingIndex] = orderToSave;
                } else {
                    console.log(`   ✅ Добавляю новый заказ...`);
                    orders[telegramUserId].push(orderToSave);
                }
                
                successCount++;
            } catch (error) {
                console.error(`   ❌ Не удалось восстановить заказ ${orderReference}`);
                errorCount++;
            }
        }
        
        // Сохраняем
        console.log(`\n💾 Сохраняю заказы...`);
        await saveOrders(orders);
        
        console.log(`\n✅ Готово!`);
        console.log(`   Успешно восстановлено: ${successCount}`);
        console.log(`   Ошибок: ${errorCount}`);
        console.log(`   Всего заказов у пользователя: ${orders[telegramUserId].length}`);
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        throw error;
    }
}

// Получаем аргументы командной строки
const telegramUserId = process.argv[2];
const orderReferences = process.argv.slice(3);

if (!telegramUserId) {
    console.error('❌ Использование: node scripts/restore-user-orders.js <telegram_user_id> [orderReference1] [orderReference2] ...');
    process.exit(1);
}

if (orderReferences.length === 0) {
    console.error('❌ Укажите хотя бы один orderReference для восстановления');
    process.exit(1);
}

restoreUserOrders(telegramUserId, orderReferences)
    .then(() => {
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Критическая ошибка:', error.message);
        process.exit(1);
    });

