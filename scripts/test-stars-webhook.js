#!/usr/bin/env node

/**
 * Скрипт для тестирования автоматического создания заказа через Telegram Stars webhook
 * 
 * Использование:
 * node scripts/test-stars-webhook.js [telegram_user_id] [bundle_name] [country_code]
 * 
 * Пример:
 * node scripts/test-stars-webhook.js 2515644 esim_1GB_7D_TH_V2 TH
 */

const path = require('path');
const fs = require('fs').promises;

// Загружаем переменные окружения
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const webhookHandler = require('../api/telegram/stars/webhook');

// Создаем mock request для webhook
function createMockWebhookRequest(telegramUserId, bundleName, countryCode = 'TH') {
    const payload = {
        bn: bundleName || 'esim_1GB_7D_TH_V2',
        pid: 'plan1',
        pt: 'standard',
        cc: countryCode,
        cn: 'Thailand',
        uid: telegramUserId || '2515644',
        amt: 1000, // 1000 Stars
        cur: 'XTR'
    };

    // Симулируем successful_payment сообщение от Telegram
    const update = {
        update_id: Date.now(),
        message: {
            message_id: Date.now(),
            from: {
                id: parseInt(telegramUserId || '2515644'),
                is_bot: false,
                first_name: 'Test',
                username: 'testuser'
            },
            chat: {
                id: parseInt(telegramUserId || '2515644'),
                type: 'private'
            },
            date: Math.floor(Date.now() / 1000),
            successful_payment: {
                currency: 'XTR',
                total_amount: 1000,
                invoice_payload: JSON.stringify(payload),
                telegram_payment_charge_id: `test_charge_${Date.now()}`,
                provider_payment_charge_id: `test_provider_${Date.now()}`
            }
        }
    };

    return {
        method: 'POST',
        body: update,
        headers: {
            'content-type': 'application/json',
            'x-telegram-bot-api-secret-token': process.env.TELEGRAM_WEBHOOK_SECRET || ''
        },
        query: {}
    };
}

// Создаем mock response
function createMockResponse() {
    const response = {
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
    return response;
}

async function testWebhook() {
    const telegramUserId = process.argv[2] || '2515644';
    const bundleName = process.argv[3] || 'esim_1GB_7D_TH_V2';
    const countryCode = process.argv[4] || 'TH';

    console.log('\n🧪 Тестирование автоматического создания заказа через Telegram Stars webhook\n');
    console.log('Параметры:');
    console.log(`  Telegram User ID: ${telegramUserId}`);
    console.log(`  Bundle Name: ${bundleName}`);
    console.log(`  Country Code: ${countryCode}\n`);

    // Проверяем наличие необходимых переменных окружения
    if (!process.env.ESIMGO_API_KEY) {
        console.error('❌ ESIMGO_API_KEY не установлен в .env');
        process.exit(1);
    }

    if (!process.env.TELEGRAM_BOT_TOKEN && !process.env.BOT_TOKEN) {
        console.error('❌ TELEGRAM_BOT_TOKEN не установлен в .env');
        process.exit(1);
    }

    console.log('✅ Переменные окружения проверены\n');

    // Создаем mock запрос и ответ
    const req = createMockWebhookRequest(telegramUserId, bundleName, countryCode);
    const res = createMockResponse();

    console.log('📤 Отправка webhook запроса...\n');

    try {
        await webhookHandler(req, res);

        console.log('\n📥 Ответ от webhook:');
        console.log(`  Status Code: ${res.statusCode}`);
        if (res.data) {
            console.log(`  Response: ${JSON.stringify(res.data, null, 2)}`);
        }

        if (res.statusCode === 200) {
            console.log('\n✅ Webhook обработан успешно!');
            console.log('\n📋 Проверьте:');
            console.log('  1. Заказ должен быть создан в eSIMgo');
            console.log('  2. Заказ должен быть сохранен в data/orders.json');
            console.log('  3. Заказ должен быть виден в админке: /admin/orders.html');
            console.log(`  4. Пользователь ${telegramUserId} должен увидеть заказ в разделе "My eSIMs"`);
        } else {
            console.log('\n⚠️ Webhook вернул неожиданный статус');
        }
    } catch (error) {
        console.error('\n❌ Ошибка при обработке webhook:');
        console.error(`  ${error.message}`);
        if (error.stack) {
            console.error(`\nStack trace:\n${error.stack}`);
        }
        process.exit(1);
    }

    // Проверяем, что заказ действительно сохранен
    console.log('\n🔍 Проверка сохранения заказа...\n');
    try {
        const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');
        const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
        const orders = JSON.parse(ordersData);

        if (orders[telegramUserId]) {
            const userOrders = orders[telegramUserId];
            const latestOrder = userOrders[userOrders.length - 1];
            
            console.log('✅ Заказ найден в базе данных:');
            console.log(`  Order Reference: ${latestOrder.orderReference || 'N/A'}`);
            console.log(`  Status: ${latestOrder.status || 'N/A'}`);
            console.log(`  Payment Method: ${latestOrder.payment_method || 'N/A'}`);
            console.log(`  ICCID: ${latestOrder.iccid || 'N/A'}`);
            console.log(`  Bundle: ${latestOrder.bundle_name || 'N/A'}`);
            console.log(`  Price: ${latestOrder.currency || 'USD'} ${latestOrder.price || 'N/A'}`);
        } else {
            console.log('⚠️ Заказ не найден в базе данных для этого пользователя');
        }
    } catch (error) {
        console.error('⚠️ Не удалось проверить сохранение заказа:', error.message);
    }

    console.log('\n✅ Тестирование завершено!\n');
}

// Запуск
testWebhook()
    .then(() => {
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Критическая ошибка:', error);
        process.exit(1);
    });




