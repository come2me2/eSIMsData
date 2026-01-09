#!/usr/bin/env node

/**
 * Скрипт для восстановления заказа из eSIMgo по orderReference
 * 
 * Использование:
 * node scripts/restore-order-from-esimgo.js <orderReference> <telegram_user_id>
 * 
 * Пример:
 * node scripts/restore-order-from-esimgo.js 08fd4ae3-1625-4824-a5d0-fd3600b700af 123456789
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
        console.log(`\n🔍 Восстанавливаю заказ ${orderReference} из eSIMgo...`);
        
        // Получаем статус заказа из eSIMgo
        const orderData = await esimgoClient.getOrderStatus(orderReference);
        
        // Получаем assignments если заказ завершен
        let assignments = null;
        if (orderData.status === 'completed') {
            try {
                assignments = await esimgoClient.getESIMAssignments(orderReference);
            } catch (assignError) {
                console.warn('⚠️  Не удалось получить assignments:', assignError.message);
            }
        }
        
        // Формируем данные заказа
        const bundleName = orderData.order?.[0]?.item || null;
        const esimData = orderData.order?.[0]?.esims?.[0] || null;
        
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
            date: orderData.date ? orderData.date.split('T')[0] : new Date().toISOString().split('T')[0],
            time: orderData.date ? orderData.date.split('T')[1]?.split('.')[0] || '00:00:00' : new Date().toTimeString().split(' ')[0],
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
            createdAt: orderData.date || orderData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Загружаем существующие заказы
        const orders = await loadOrders();
        
        // Добавляем заказ
        if (!orders[telegramUserId]) {
            orders[telegramUserId] = [];
        }
        
        // Проверяем, нет ли уже такого заказа
        const existingIndex = orders[telegramUserId].findIndex(
            o => o.orderReference === orderReference || o.number === orderReference
        );
        
        if (existingIndex >= 0) {
            console.log('⚠️  Заказ уже существует, обновляю...');
            orders[telegramUserId][existingIndex] = orderToSave;
        } else {
            console.log('✅ Добавляю новый заказ...');
            orders[telegramUserId].push(orderToSave);
        }
        
        // Сохраняем
        await saveOrders(orders);
        
        console.log('\n✅ Заказ успешно восстановлен!');
        console.log(`   Order Reference: ${orderReference}`);
        console.log(`   User ID: ${telegramUserId}`);
        console.log(`   Status: ${orderToSave.status}`);
        
        return orderToSave;
        
    } catch (error) {
        console.error('❌ Ошибка при восстановлении заказа:', error);
        throw error;
    }
}

// Получаем аргументы командной строки
const orderReference = process.argv[2];
const telegramUserId = process.argv[3];

if (!orderReference || !telegramUserId) {
    console.error('❌ Использование: node scripts/restore-order-from-esimgo.js <orderReference> <telegram_user_id>');
    process.exit(1);
}

restoreOrder(orderReference, telegramUserId)
    .then(() => {
        console.log('\n✅ Готово!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Ошибка:', error.message);
        process.exit(1);
    });

