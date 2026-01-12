/**
 * Скрипт для настройки webhook Telegram бота
 * 
 * Использование:
 *   node scripts/setup-bot-webhook.js
 * 
 * Или с указанием URL:
 *   node scripts/setup-bot-webhook.js https://esimsdata.app
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
// Первый аргумент может быть URL или командой (delete/remove)
const firstArg = process.argv[2];
const WEBHOOK_URL = (firstArg && !firstArg.match(/^(delete|remove)$/i)) 
    ? firstArg 
    : (process.env.WEBHOOK_URL || 'https://esimsdata.app');

if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN не найден в переменных окружения!');
    console.error('   Установите TELEGRAM_BOT_TOKEN в файле .env');
    process.exit(1);
}

const webhookEndpoint = `${WEBHOOK_URL}/api/telegram/bot/webhook`;

async function setWebhook() {
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;
        
        const payload = {
            url: webhookEndpoint,
            allowed_updates: ['message', 'callback_query', 'pre_checkout_query', 'successful_payment']
        };

        // Если установлен секрет, добавляем его
        if (WEBHOOK_SECRET) {
            payload.secret_token = WEBHOOK_SECRET;
        }

        console.log('🔧 Настройка webhook...');
        console.log(`   URL: ${webhookEndpoint}`);
        if (WEBHOOK_SECRET) {
            console.log(`   Secret: ${WEBHOOK_SECRET.substring(0, 10)}...`);
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.ok) {
            console.log('✅ Webhook успешно настроен!');
            console.log(`   Описание: ${data.description || 'OK'}`);
            
            // Получаем информацию о текущем webhook
            const infoUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`;
            const infoResponse = await fetch(infoUrl);
            const infoData = await infoResponse.json();
            
            if (infoData.ok) {
                console.log('\n📋 Информация о webhook:');
                console.log(`   URL: ${infoData.result.url || 'не установлен'}`);
                console.log(`   Ожидает обновления: ${infoData.result.pending_update_count || 0}`);
                if (infoData.result.last_error_date) {
                    console.log(`   ⚠️ Последняя ошибка: ${infoData.result.last_error_message}`);
                    console.log(`   Дата ошибки: ${new Date(infoData.result.last_error_date * 1000).toISOString()}`);
                }
            }
        } else {
            console.error('❌ Ошибка настройки webhook:', data.description);
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Ошибка при настройке webhook:', error.message);
        process.exit(1);
    }
}

async function deleteWebhook() {
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ drop_pending_updates: true })
        });

        const data = await response.json();
        if (data.ok) {
            console.log('✅ Webhook удален');
        } else {
            console.error('❌ Ошибка удаления webhook:', data.description);
        }
    } catch (error) {
        console.error('❌ Ошибка при удалении webhook:', error.message);
    }
}

// Обработка аргументов командной строки
const command = firstArg && firstArg.match(/^(delete|remove)$/i) ? firstArg.toLowerCase() : null;

if (command) {
    deleteWebhook();
} else {
    setWebhook();
}

