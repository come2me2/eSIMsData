#!/usr/bin/env node

/**
 * Скрипт для добавления уже оплаченного заказа из eSIMgo в админку
 * 
 * Использование:
 * node scripts/add-order-from-esimgo.js <orderReference> [telegram_user_id]
 * 
 * Пример:
 * node scripts/add-order-from-esimgo.js ORD-123456 123456789
 */

const esimgoClient = require('../api/_lib/esimgo/client');
const path = require('path');
const fs = require('fs').promises;

// Загружаем переменные окружения
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');

// Загрузить все заказы
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

// Сохранить все заказы
async function saveOrders(orders) {
    const dataDir = path.dirname(ORDERS_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
}

async function addOrderFromESIMgo(orderReference, telegramUserId = null) {
    try {
        console.log(`\n🔍 Получаю данные заказа ${orderReference} из eSIMgo...`);
        
        // Получаем полный статус заказа из eSIMgo
        const orderData = await esimgoClient.getOrderStatus(orderReference);
        
        console.log('✅ Данные заказа получены:', {
            orderReference: orderData.orderReference,
            status: orderData.status,
            total: orderData.total,
            currency: orderData.currency
        });
        
        // Получаем assignments (ICCID, matchingId, smdpAddress)
        let assignments = null;
        if (orderData.status === 'completed') {
            try {
                assignments = await esimgoClient.getESIMAssignments(orderReference);
                console.log('✅ Assignments получены:', {
                    hasIccid: !!assignments?.iccid,
                    hasMatchingId: !!assignments?.matchingId,
                    hasSmdpAddress: !!assignments?.smdpAddress
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
            // Ищем заказ с таким же orderReference
            for (const userId in allOrders) {
                const userOrders = allOrders[userId];
                const existingOrder = userOrders.find(o => o.orderReference === orderReference);
                if (existingOrder) {
                    finalTelegramUserId = userId;
                    console.log(`📌 Найден существующий заказ для пользователя: ${userId}`);
                    break;
                }
            }
        }
        
        if (!finalTelegramUserId) {
            console.error('❌ telegram_user_id не указан и не найден в существующих заказах');
            console.log('\n💡 Укажите telegram_user_id вручную:');
            console.log(`   node scripts/add-order-from-esimgo.js ${orderReference} <telegram_user_id>`);
            process.exit(1);
        }
        
        // Формируем данные для сохранения
        const orderToSave = {
            telegram_user_id: finalTelegramUserId,
            orderReference: orderReference,
            iccid: assignments?.iccid || esimData?.iccid || null,
            matchingId: assignments?.matchingId || null,
            smdpAddress: assignments?.smdpAddress || null,
            country_code: null, // Можно указать вручную, если известно
            country_name: null,
            plan_id: null,
            plan_type: null,
            bundle_name: bundleName,
            price: orderData.total || null,
            currency: orderData.currency || 'USD',
            status: orderData.status || 'completed',
            createdAt: orderData.date || orderData.createdAt || new Date().toISOString(),
            // Обязательные поля
            source: 'telegram_mini_app',
            customer: finalTelegramUserId,
            provider_product_id: bundleName || null,
            provider_base_price_usd: orderData.basePrice || null,
            payment_method: 'telegram_stars', // Предполагаем, что это Stars, можно изменить
            // Дополнительные данные
            order_status: orderData.status,
            order_total: orderData.total,
            order_currency: orderData.currency,
            order_date: orderData.date || orderData.createdAt || new Date().toISOString()
        };
        
        // Сохраняем заказ
        const allOrders = await loadOrders();
        
        if (!allOrders[finalTelegramUserId]) {
            allOrders[finalTelegramUserId] = [];
        }
        
        // Проверяем, не существует ли уже такой заказ
        const existingIndex = allOrders[finalTelegramUserId].findIndex(
            o => o.orderReference === orderReference
        );
        
        if (existingIndex >= 0) {
            // Обновляем существующий заказ
            allOrders[finalTelegramUserId][existingIndex] = {
                ...allOrders[finalTelegramUserId][existingIndex],
                ...orderToSave,
                updatedAt: new Date().toISOString()
            };
            console.log('✅ Существующий заказ обновлен');
        } else {
            // Добавляем новый заказ
            allOrders[finalTelegramUserId].push(orderToSave);
            console.log('✅ Новый заказ добавлен');
        }
        
        await saveOrders(allOrders);
        
        console.log('\n📦 Заказ успешно добавлен в админку:');
        console.log(`   Order Reference: ${orderReference}`);
        console.log(`   Telegram User ID: ${finalTelegramUserId}`);
        console.log(`   Status: ${orderToSave.status}`);
        console.log(`   Price: ${orderToSave.currency} ${orderToSave.price}`);
        console.log(`   Bundle: ${bundleName || 'N/A'}`);
        if (orderToSave.iccid) {
            console.log(`   ICCID: ${orderToSave.iccid}`);
        }
        
        return orderToSave;
        
    } catch (error) {
        console.error('❌ Ошибка при добавлении заказа:', error);
        if (error.message) {
            console.error('   Сообщение:', error.message);
        }
        process.exit(1);
    }
}

// Запуск скрипта
const orderReference = process.argv[2];
const telegramUserId = process.argv[3] || null;

if (!orderReference) {
    console.error('❌ Укажите orderReference заказа из eSIMgo');
    console.log('\nИспользование:');
    console.log('  node scripts/add-order-from-esimgo.js <orderReference> [telegram_user_id]');
    console.log('\nПример:');
    console.log('  node scripts/add-order-from-esimgo.js ORD-123456 123456789');
    process.exit(1);
}

addOrderFromESIMgo(orderReference, telegramUserId)
    .then(() => {
        console.log('\n✅ Готово!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Критическая ошибка:', error);
        process.exit(1);
    });






