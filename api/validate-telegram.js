/**
 * Telegram Mini App Data Validation API
 * Поддерживает оба метода:
 * 1. signature (Ed25519) - новый метод Bot API 8.0+
 * 2. hash (HMAC-SHA256) - классический метод
 * 
 * Документация: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

// Загружаем переменные окружения из .env файла (на случай, если они не загружены в server.js)
const path = require('path');
if (!process.env.TELEGRAM_BOT_TOKEN && !process.env.BOT_TOKEN) {
    try {
        require('dotenv').config({ path: path.join(__dirname, '../.env') });
    } catch (e) {
        // Игнорируем ошибки загрузки .env
    }
}

const crypto = require('crypto');

/**
 * Публичный ключ Telegram для проверки signature Mini Apps (Ed25519)
 * Получен из документации Telegram Bot API
 * Формат: hex-encoded 32 bytes
 */
const TELEGRAM_PUBLIC_KEY_HEX = 'e7bf03a2fa4602af4580703d88dda5bb59f32ed8b02a56c187fe7d34caed242d';

/**
 * Простая реализация Ed25519 verify без внешних зависимостей
 * Использует встроенный crypto модуль Node.js 16+
 */
function verifyEd25519(message, signature, publicKey) {
    try {
        // Создаём публичный ключ в формате, который понимает Node.js
        // Ed25519 public key в DER формате
        const keyPrefix = Buffer.from('302a300506032b6570032100', 'hex');
        const derKey = Buffer.concat([keyPrefix, publicKey]);
        
        const keyObject = crypto.createPublicKey({
            key: derKey,
            format: 'der',
            type: 'spki'
        });
        
        return crypto.verify(
            null,
            message,
            keyObject,
            signature
        );
    } catch (error) {
        console.error('Ed25519 verify error:', error.message);
        return false;
    }
}

/**
 * Валидация через signature (Ed25519) - новый метод Bot API 8.0+
 * @param {string} initData - строка initData от Telegram WebApp
 * @returns {Object} - результат валидации
 */
function validateBySignature(initData) {
    try {
        const urlParams = new URLSearchParams(initData);
        const signature = urlParams.get('signature');
        
        if (!signature) {
            return { valid: false, error: 'No signature in initData', method: 'signature', fallback: true };
        }
        
        // Удаляем signature из параметров для проверки
        urlParams.delete('signature');
        // Также удаляем hash если есть (не участвует в signature проверке)
        urlParams.delete('hash');
        
        // Создаём строку для проверки (отсортированные параметры через \n)
        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        // Декодируем signature из base64
        const signatureBuffer = Buffer.from(signature, 'base64');
        const publicKeyBuffer = Buffer.from(TELEGRAM_PUBLIC_KEY_HEX, 'hex');
        const messageBuffer = Buffer.from(dataCheckString, 'utf8');
        
        // Проверяем подпись Ed25519
        const isValid = verifyEd25519(messageBuffer, signatureBuffer, publicKeyBuffer);
        
        if (isValid) {
            // Парсим данные пользователя
            const userJson = urlParams.get('user');
            let user = null;
            if (userJson) {
                try {
                    user = JSON.parse(decodeURIComponent(userJson));
                } catch {
                    user = JSON.parse(userJson);
                }
            }
            const authDate = urlParams.get('auth_date');
            
            return {
                valid: true,
                method: 'signature',
                algorithm: 'Ed25519',
                user: user,
                auth_date: authDate ? parseInt(authDate) : null,
                data: Object.fromEntries(urlParams)
            };
        }
        
        return { valid: false, error: 'Invalid Ed25519 signature', method: 'signature', fallback: true };
        
    } catch (error) {
        console.error('Signature validation error:', error);
        return { valid: false, error: error.message, method: 'signature', fallback: true };
    }
}

/**
 * Валидация через hash (HMAC-SHA256) - классический метод
 * @param {string} initData - строка initData от Telegram WebApp
 * @param {string} botToken - токен бота
 * @returns {Object} - результат валидации
 */
function validateByHash(initData, botToken) {
    try {
        if (!botToken) {
            return { 
                valid: false, 
                error: 'BOT_TOKEN not configured. Please set TELEGRAM_BOT_TOKEN environment variable on the server.', 
                method: 'hash' 
            };
        }
        
        // Логируем для отладки (без чувствительных данных)
        console.log('Hash validation attempt:', {
            hasInitData: !!initData,
            initDataLength: initData?.length || 0,
            hasBotToken: !!botToken,
            botTokenLength: botToken?.length || 0
        });
        
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        
        if (!hash) {
            return { valid: false, error: 'No hash in initData', method: 'hash' };
        }
        
        // Удаляем hash из параметров для проверки
        urlParams.delete('hash');
        
        // Создаём строку для проверки (отсортированные параметры через \n)
        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        // Вычисляем secret key: HMAC-SHA256("WebAppData", botToken)
        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();
        
        // Вычисляем hash: HMAC-SHA256(secretKey, dataCheckString)
        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        
        // Логируем для отладки (без чувствительных данных)
        console.log('Hash comparison:', {
            receivedHash: hash.substring(0, 8) + '...',
            calculatedHash: calculatedHash.substring(0, 8) + '...',
            match: calculatedHash === hash,
            dataCheckStringLength: dataCheckString.length,
            paramsCount: urlParams.size
        });
        
        // Сравниваем хеши
        if (calculatedHash === hash) {
            const userJson = urlParams.get('user');
            let user = null;
            if (userJson) {
                try {
                    user = JSON.parse(decodeURIComponent(userJson));
                } catch {
                    user = JSON.parse(userJson);
                }
            }
            const authDate = urlParams.get('auth_date');
            
            return {
                valid: true,
                method: 'hash',
                algorithm: 'HMAC-SHA256',
                user: user,
                auth_date: authDate ? parseInt(authDate) : null,
                data: Object.fromEntries(urlParams)
            };
        }
        
        return { valid: false, error: 'Hash mismatch - data may be tampered', method: 'hash' };
        
    } catch (error) {
        console.error('Hash validation error:', error);
        return { valid: false, error: error.message, method: 'hash' };
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
                error: 'initData is required in request body' 
            });
        }
        
        // Логируем полученные данные (без чувствительной информации)
        console.log('Received validation request:', {
            hasInitData: !!initData,
            initDataType: typeof initData,
            initDataLength: initData?.length || 0,
            hasBotToken: !!(process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN),
            botTokenLength: (process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN)?.length || 0
        });
        
        let result;
        
        // 1. Сначала пробуем signature (Ed25519) - новый метод
        result = validateBySignature(initData);
        
        // 2. Если signature нет или ошибка - используем hash (HMAC-SHA256)
        if (!result.valid && result.fallback) {
            // Поддерживаем оба варианта имени переменной для совместимости
            const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
            
            if (!botToken) {
                console.warn('TELEGRAM_BOT_TOKEN or BOT_TOKEN not set in environment variables');
            }
            
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
        
        // Логируем результат
        console.log('Telegram validation:', {
            valid: result.valid,
            method: result.method,
            algorithm: result.algorithm,
            user_id: result.user?.id,
            error: result.error || null
        });
        
        // Удаляем внутренние поля перед отправкой
        delete result.fallback;
        
        return res.status(result.valid ? 200 : 401).json(result);
        
    } catch (error) {
        console.error('Validation API error:', error);
        return res.status(500).json({ 
            valid: false, 
            error: 'Internal server error: ' + error.message 
        });
    }
};

        return res.status(result.valid ? 200 : 401).json(result);
        
    } catch (error) {
        console.error('Validation API error:', error);
        return res.status(500).json({ 
            valid: false, 
            error: 'Internal server error: ' + error.message 
        });
    }
};
