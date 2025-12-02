/**
 * Telegram Mini App Data Validation API
 * Валидация initData через signature (Ed25519) - новый метод Bot API 8.0+
 * 
 * Документация: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

import crypto from 'crypto';

// Публичный ключ Telegram для проверки signature Mini Apps
// Этот ключ публичный и одинаковый для всех Mini Apps
const TELEGRAM_PUBLIC_KEY = 'e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d';

/**
 * Валидация через signature (Ed25519) - новый метод
 * @param {string} initData - строка initData от Telegram WebApp
 * @returns {Object} - результат валидации
 */
function validateBySignature(initData) {
    try {
        const urlParams = new URLSearchParams(initData);
        const signature = urlParams.get('signature');
        
        if (!signature) {
            return { valid: false, error: 'No signature in initData', method: 'signature' };
        }
        
        // Удаляем signature из параметров для проверки
        urlParams.delete('signature');
        
        // Создаём строку для проверки (отсортированные параметры через \n)
        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        // Декодируем signature из base64
        const signatureBuffer = Buffer.from(signature, 'base64');
        const publicKeyBuffer = Buffer.from(TELEGRAM_PUBLIC_KEY, 'hex');
        const dataBuffer = Buffer.from(dataCheckString, 'utf8');
        
        // Проверяем подпись Ed25519
        const isValid = crypto.verify(
            null, // Ed25519 не использует алгоритм хеширования
            dataBuffer,
            {
                key: publicKeyBuffer,
                format: 'raw',
                type: 'ed25519'
            },
            signatureBuffer
        );
        
        if (isValid) {
            // Парсим данные пользователя
            const userJson = urlParams.get('user');
            const user = userJson ? JSON.parse(userJson) : null;
            const authDate = urlParams.get('auth_date');
            
            return {
                valid: true,
                method: 'signature',
                user: user,
                auth_date: authDate ? parseInt(authDate) : null,
                data: Object.fromEntries(urlParams)
            };
        }
        
        return { valid: false, error: 'Invalid signature', method: 'signature' };
        
    } catch (error) {
        console.error('Signature validation error:', error);
        return { valid: false, error: error.message, method: 'signature' };
    }
}

/**
 * Валидация через hash (HMAC-SHA256) - старый метод (fallback)
 * @param {string} initData - строка initData от Telegram WebApp
 * @param {string} botToken - токен бота
 * @returns {Object} - результат валидации
 */
function validateByHash(initData, botToken) {
    try {
        if (!botToken) {
            return { valid: false, error: 'BOT_TOKEN not configured', method: 'hash' };
        }
        
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        
        if (!hash) {
            return { valid: false, error: 'No hash in initData', method: 'hash' };
        }
        
        urlParams.delete('hash');
        
        // Создаём строку для проверки
        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        // Вычисляем secret key
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();
        
        // Вычисляем hash
        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        
        if (calculatedHash === hash) {
            const userJson = urlParams.get('user');
            const user = userJson ? JSON.parse(userJson) : null;
            const authDate = urlParams.get('auth_date');
            
            return {
                valid: true,
                method: 'hash',
                user: user,
                auth_date: authDate ? parseInt(authDate) : null,
                data: Object.fromEntries(urlParams)
            };
        }
        
        return { valid: false, error: 'Invalid hash', method: 'hash' };
        
    } catch (error) {
        console.error('Hash validation error:', error);
        return { valid: false, error: error.message, method: 'hash' };
    }
}

/**
 * Проверка свежести данных (auth_date не старше 24 часов)
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
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { initData } = req.body;
        
        if (!initData) {
            return res.status(400).json({ 
                valid: false, 
                error: 'initData is required' 
            });
        }
        
        // Пробуем валидацию через signature (предпочтительный метод)
        let result = validateBySignature(initData);
        
        // Если signature нет или невалидный, пробуем hash (fallback)
        if (!result.valid && result.error === 'No signature in initData') {
            const botToken = process.env.BOT_TOKEN;
            result = validateByHash(initData, botToken);
        }
        
        // Проверяем свежесть данных
        if (result.valid && result.auth_date) {
            const isFresh = isAuthDateValid(result.auth_date);
            result.auth_date_valid = isFresh;
            
            if (!isFresh) {
                result.warning = 'auth_date is older than 24 hours';
            }
        }
        
        // Логируем результат (для отладки)
        console.log('Telegram validation result:', {
            valid: result.valid,
            method: result.method,
            user_id: result.user?.id,
            auth_date_valid: result.auth_date_valid
        });
        
        return res.status(result.valid ? 200 : 401).json(result);
        
    } catch (error) {
        console.error('Validation API error:', error);
        return res.status(500).json({ 
            valid: false, 
            error: 'Internal server error' 
        });
    }
}

