/**
 * Telegram Mini App Data Validation API
 * Валидация initData через hash (HMAC-SHA256)
 * 
 * Документация: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

const crypto = require('crypto');

/**
 * Валидация через hash (HMAC-SHA256)
 * Это официальный метод валидации данных Telegram Mini App
 * 
 * @param {string} initData - строка initData от Telegram WebApp
 * @param {string} botToken - токен бота
 * @returns {Object} - результат валидации
 */
function validateInitData(initData, botToken) {
    try {
        if (!botToken) {
            return { 
                valid: false, 
                error: 'BOT_TOKEN not configured. Add it to Vercel Environment Variables.', 
                method: 'hash' 
            };
        }
        
        if (!initData) {
            return { 
                valid: false, 
                error: 'initData is empty', 
                method: 'hash' 
            };
        }
        
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        
        if (!hash) {
            return { 
                valid: false, 
                error: 'No hash in initData', 
                method: 'hash' 
            };
        }
        
        // Удаляем hash из параметров для проверки
        urlParams.delete('hash');
        
        // Создаём строку для проверки (отсортированные параметры через \n)
        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        // Вычисляем secret key: HMAC-SHA256(botToken, "WebAppData")
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();
        
        // Вычисляем hash: HMAC-SHA256(secretKey, dataCheckString)
        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        
        // Сравниваем хеши
        if (calculatedHash === hash) {
            // Парсим данные пользователя
            const userJson = urlParams.get('user');
            const user = userJson ? JSON.parse(decodeURIComponent(userJson)) : null;
            const authDate = urlParams.get('auth_date');
            
            return {
                valid: true,
                method: 'hash',
                user: user,
                auth_date: authDate ? parseInt(authDate) : null,
                data: Object.fromEntries(urlParams)
            };
        }
        
        return { 
            valid: false, 
            error: 'Hash mismatch - data may be tampered', 
            method: 'hash' 
        };
        
    } catch (error) {
        console.error('Validation error:', error);
        return { 
            valid: false, 
            error: error.message, 
            method: 'hash' 
        };
    }
}

/**
 * Проверка свежести данных (auth_date не старше указанного времени)
 * @param {number} authDate - timestamp авторизации
 * @param {number} maxAgeSeconds - максимальный возраст в секундах (по умолчанию 24 часа)
 * @returns {boolean}
 */
function isAuthDateValid(authDate, maxAgeSeconds = 86400) {
    if (!authDate) return false;
    const now = Math.floor(Date.now() / 1000);
    return (now - authDate) <= maxAgeSeconds;
}

/**
 * Главный обработчик API
 */
module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only POST allowed
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { initData } = req.body;
        
        if (!initData) {
            return res.status(400).json({ 
                valid: false, 
                error: 'initData is required in request body' 
            });
        }
        
        // Получаем BOT_TOKEN из environment variables
        const botToken = process.env.BOT_TOKEN;
        
        // Валидация
        const result = validateInitData(initData, botToken);
        
        // Проверяем свежесть данных
        if (result.valid && result.auth_date) {
            const isFresh = isAuthDateValid(result.auth_date);
            result.auth_date_valid = isFresh;
            
            if (!isFresh) {
                result.warning = 'auth_date is older than 24 hours';
            }
        }
        
        // Логируем результат (для отладки в Vercel Logs)
        console.log('Telegram validation:', {
            valid: result.valid,
            method: result.method,
            user_id: result.user?.id,
            error: result.error || null
        });
        
        return res.status(result.valid ? 200 : 401).json(result);
        
    } catch (error) {
        console.error('Validation API error:', error);
        return res.status(500).json({ 
            valid: false, 
            error: 'Internal server error: ' + error.message 
        });
    }
};
