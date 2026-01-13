/**
 * Telegram Bot webhook handler
 * Endpoint: POST /api/telegram/bot/webhook
 *
 * Обрабатывает команды бота, включая /start
 */

// Загружаем переменные окружения из .env файла
const path = require('path');
if (!process.env.TELEGRAM_BOT_TOKEN && !process.env.BOT_TOKEN) {
    try {
        require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
    } catch (e) {
        // Игнорируем ошибки загрузки .env
    }
}

// Загружаем переменные окружения
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
// URL для Telegram Mini App (можно задать через переменную окружения или использовать домен по умолчанию)
const WEBAPP_URL = process.env.TELEGRAM_WEBAPP_URL || process.env.WEBAPP_URL || 'https://esimsdata.app';

// Проверяем при загрузке модуля
if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in bot webhook.js');
} else {
    console.log('✅ TELEGRAM_BOT_TOKEN available in bot webhook.js');
}

/**
 * Вызов Telegram Bot API
 */
async function callTelegram(method, payload) {
    if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not set');
    
    // Проверяем доступность fetch
    let fetchFunction = fetch;
    if (typeof fetch === 'undefined') {
        try {
            fetchFunction = require('node-fetch');
        } catch (e) {
            throw new Error('fetch is not available and node-fetch is not installed');
        }
    }
    
    // Добавляем таймаут для запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут
    
    try {
        console.log(`📤 Calling Telegram API: ${method}`);
        const resp = await fetchFunction(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!resp.ok) {
            const errorText = await resp.text();
            console.error(`❌ Telegram API HTTP error (${resp.status}):`, errorText);
            throw new Error(`HTTP ${resp.status}: ${errorText}`);
        }
        
        const data = await resp.json();
        if (!data.ok) {
            console.error(`❌ Telegram ${method} failed:`, data);
            throw new Error(data.description || `${method} failed`);
        }
        console.log(`✅ Telegram API ${method} succeeded`);
        return data.result;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError' || error.message?.includes('timeout')) {
            console.error(`❌ Telegram API request timed out (10s):`, error.message);
            throw new Error('Telegram API request timed out');
        }
        console.error(`❌ Telegram API error:`, error.message, error.stack);
        throw error;
    }
}

/**
 * Обработка команды /start
 */
async function handleStartCommand(chatId, userId, username) {
    const welcomeMessage = `You're all set!

Instant access to global eSIMs for travel and everyday use — no apps, just Telegram.`;

    // Создаем inline keyboard с кнопкой WebApp
    const keyboard = {
        inline_keyboard: [
            [
                {
                    text: 'Get eSIM',
                    web_app: {
                        url: WEBAPP_URL
                    }
                }
            ]
        ]
    };

    try {
        await callTelegram('sendMessage', {
            chat_id: chatId,
            text: welcomeMessage,
            reply_markup: keyboard
        });
        console.log(`✅ Start command handled for user ${userId} (@${username || 'unknown'})`);
    } catch (error) {
        console.error('❌ Failed to send start message:', error.message);
        throw error;
    }
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-telegram-bot-api-secret-token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Проверка секрета webhook (если установлен)
    if (WEBHOOK_SECRET) {
        const headerToken = req.headers['x-telegram-bot-api-secret-token'];
        if (!headerToken || headerToken !== WEBHOOK_SECRET) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
    }

    const update = req.body || {};

    // Перенаправляем Stars платежи на stars webhook
    if (update.pre_checkout_query || (update.message && update.message.successful_payment)) {
        console.log('🔄 Redirecting Stars payment update to stars webhook:', {
            has_pre_checkout_query: !!update.pre_checkout_query,
            has_successful_payment: !!(update.message && update.message.successful_payment),
            user_id: update.pre_checkout_query?.from?.id || update.message?.from?.id
        });
        
        // Импортируем и вызываем stars webhook handler
        const starsWebhook = require('../stars/webhook');
        return starsWebhook(req, res);
    }

    // Обработка команды /start
    if (update.message && update.message.text) {
        const message = update.message;
        const text = message.text.trim();
        const chatId = message.chat.id;
        const userId = message.from?.id;
        const username = message.from?.username;

        // Проверяем, является ли сообщение командой /start
        if (text === '/start' || text.startsWith('/start ')) {
            try {
                await handleStartCommand(chatId, userId, username);
                return res.status(200).json({ ok: true });
            } catch (error) {
                console.error('❌ Error handling /start command:', error);
                // Все равно возвращаем 200, чтобы Telegram не повторял запрос
                return res.status(200).json({ ok: true, error: error.message });
            }
        }
    }

    // Для всех остальных обновлений возвращаем успешный ответ
    return res.status(200).json({ ok: true });
};

