/**
 * Cryptomus - Create Invoice endpoint
 * Endpoint: POST /api/cryptomus/create-invoice
 *
 * Создает invoice в Cryptomus для оплаты eSIM или Extend
 * Учитывает все наценки (базовая маржа + наценка по стране + наценка Cryptomus)
 */

const path = require('path');
const fs = require('fs').promises;
const cryptomusClient = require('../_lib/cryptomus/client');

// Файл с настройками админки
const SETTINGS_FILE = path.join(__dirname, '..', '..', 'data', 'admin-settings.json');

// Загрузить настройки наценок из админки
async function loadMarkupSettings() {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Настройки по умолчанию
            console.log('[Cryptomus] Using default markup settings');
            return {
                markup: {
                    enabled: true,
                    base: 1.29,
                    defaultMultiplier: 1.29
                },
                paymentMethods: {
                    crypto: { 
                        enabled: true,
                        markup: 1.0,
                        markupMultiplier: 1.0
                    }
                }
            };
        }
        console.error('[Cryptomus] Error loading markup settings:', error);
        throw error;
    }
}

function parsePrice(value) {
    if (typeof value === 'number' && value > 0) return value;
    if (typeof value === 'string') {
        const match = value.match(/([\d.,]+)/);
        if (match) {
            const parsed = parseFloat(match[1].replace(',', '.'));
            if (!Number.isNaN(parsed) && parsed > 0) {
                return parsed;
            }
        }
    }
    return null;
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        console.log('[Cryptomus] ========================================');
        console.log('[Cryptomus] Create invoice request received:', {
            method: req.method,
            url: req.url,
            body: req.body
        });
        console.log('[Cryptomus] ========================================');
        
        const {
            plan_id,
            plan_type,
            bundle_name,
            country_code,
            country_name,
            price, // себестоимость от eSIM Go
            currency = 'USD',
            telegram_user_id,
            telegram_username,
            iccid // ICCID существующей eSIM для добавления трафика (extend mode)
        } = req.body || {};

        // ✅ КРИТИЧЕСКОЕ ЛОГИРОВАНИЕ для Extend flow
        console.log('[Cryptomus] 🔍 EXTEND FLOW CHECK - Request body analysis:', {
            hasIccid: !!iccid,
            iccid: iccid || 'NOT PROVIDED',
            iccidType: typeof iccid,
            isExtendMode: !!(iccid && iccid.trim() !== ''),
            plan_id: plan_id || 'MISSING',
            bundle_name: bundle_name || 'MISSING',
            telegram_user_id: telegram_user_id || 'MISSING'
        });

        // Генерируем country_code если его нет
        let finalCountryCode = (country_code && String(country_code).trim() !== '') ? String(country_code).trim() : null;
        
        if (!finalCountryCode && country_name) {
            const countryName = String(country_name).trim();
            
            // Маппинг регионов и Global
            if (countryName.toLowerCase() === 'global') {
                finalCountryCode = 'GLOBAL';
            } else {
                const regionCodeMap = {
                    'Africa': 'AFRICA',
                    'Asia': 'ASIA',
                    'Europe': 'EUROPE',
                    'Latin America': 'LATAM',
                    'North America': 'NA',
                    'Balkanas': 'BALKANAS',
                    'Central Eurasia': 'CIS',
                    'Oceania': 'OCEANIA'
                };
                finalCountryCode = regionCodeMap[countryName] || countryName.replace(/\s+/g, '').toUpperCase();
            }
        }

        // Валидация обязательных полей
        const missingFields = [];
        if (!plan_id) missingFields.push('plan_id');
        if (!plan_type) missingFields.push('plan_type');
        if (!bundle_name) missingFields.push('bundle_name');
        if (!finalCountryCode) missingFields.push('country_code');
        if (!price) missingFields.push('price');
        if (!telegram_user_id) missingFields.push('telegram_user_id');
        
        if (missingFields.length > 0) {
            console.error('[Cryptomus] ❌ Missing required fields:', missingFields);
            return res.status(400).json({
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        const costPrice = parsePrice(price);
        if (!costPrice) {
            return res.status(400).json({ success: false, error: 'Invalid price format' });
        }

        // ✅ Загружаем настройки наценок из админки
        const settings = await loadMarkupSettings();
        const markup = settings.markup || {};
        const paymentMethods = settings.paymentMethods || {};
        
        // Если наценка отключена, используем цену без наценки
        if (!markup.enabled) {
            console.log('[Cryptomus] Markup is disabled, using cost price without markup');
        }
        
        // Получаем базовую маржу (например, 1.29 = +29%)
        const baseMarkup = markup.enabled ? (markup.base || markup.defaultMultiplier || 1.0) : 1.0;
        
        // Проверяем наценку по стране
        let countryMarkup = 1.0;
        if (finalCountryCode && markup.countryMarkups && markup.countryMarkups[finalCountryCode]) {
            const countryPercent = markup.countryMarkups[finalCountryCode];
            countryMarkup = 1 + (countryPercent / 100);
            console.log(`[Cryptomus] Country markup found for ${finalCountryCode}: ${countryPercent}% (multiplier: ${countryMarkup})`);
        }
        
        // Получаем маржу для Cryptomus (например, 1.0 = без дополнительной наценки)
        const cryptoMethod = paymentMethods.crypto || {};
        const cryptomusMarkup = cryptoMethod.enabled ? (cryptoMethod.markupMultiplier || cryptoMethod.markup || 1.0) : 1.0;
        
        // ✅ Рассчитываем финальную цену со всеми наценками
        const finalPrice = costPrice * baseMarkup * countryMarkup * cryptomusMarkup;
        
        console.log('[Cryptomus] Price calculation:', {
            cost: costPrice,
            baseMarkup: baseMarkup,
            countryMarkup: countryMarkup,
            countryCode: finalCountryCode,
            cryptomusMarkup: cryptomusMarkup,
            finalPrice: finalPrice.toFixed(2),
            formula: `${costPrice} × ${baseMarkup} × ${countryMarkup} × ${cryptomusMarkup} = ${finalPrice.toFixed(2)}`
        });

        // Генерируем уникальный order_id
        const orderId = `cryptomus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Определяем base URL для callback и return URLs
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}`
            : process.env.BASE_URL || 'https://yourdomain.com';

        // Создаем заказ со статусом on_hold (асинхронно, не блокируем ответ)
        setImmediate(async () => {
            try {
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const ordersHandler = require('../orders');
                const orderReq = {
                    method: 'POST',
                    body: {
                        telegram_user_id: telegram_user_id,
                        orderReference: `pending_${orderId}`,
                        status: 'on_hold',
                        payment_method: 'cryptomus',
                        payment_session_id: orderId,
                        payment_status: 'pending',
                        country_code: finalCountryCode,
                        country_name: country_name,
                        plan_id: plan_id,
                        plan_type: plan_type,
                        bundle_name: bundle_name,
                        price: finalPrice,
                        finalPrice: finalPrice,
                        currency: currency,
                        provider_base_price_usd: costPrice,
                        provider_product_id: bundle_name,
                        source: 'telegram_mini_app',
                        customer: telegram_user_id,
                        iccid: iccid && iccid.trim() !== '' ? iccid.trim() : undefined,
                        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 60 минут
                        createdAt: new Date().toISOString()
                    }
                };
                
                const orderRes = {
                    status: (code) => ({ json: (data) => {} }),
                    setHeader: () => {},
                    statusCode: 200
                };
                
                await ordersHandler(orderReq, orderRes);
                
                console.log('✅ Cryptomus order created with status on_hold (async):', {
                    orderId,
                    telegram_user_id,
                    bundle_name,
                    expires_at: orderReq.body.expires_at
                });
            } catch (orderError) {
                console.error('⚠️ Failed to create on_hold order (async):', orderError);
            }
        });

        // Создаем invoice в Cryptomus
        // Не передаем to_currency и network, чтобы Cryptomus показывал все доступные криптовалюты
        const invoiceData = {
            amount: finalPrice.toFixed(2),
            currency: currency,
            order_id: orderId,
            url_callback: `${baseUrl}/api/cryptomus/webhook`,
            url_return: `${baseUrl}/checkout?order_id=${orderId}&payment_method=cryptomus`,
            lifetime: parseInt(process.env.CRYPTOMUS_INVOICE_LIFETIME || '3600')
        };

        // Добавляем to_currency и network только если они явно заданы в env
        // Если не заданы, Cryptomus покажет все доступные криптовалюты из аккаунта
        if (process.env.CRYPTOMUS_DEFAULT_CURRENCY) {
            invoiceData.to_currency = process.env.CRYPTOMUS_DEFAULT_CURRENCY;
        }
        if (process.env.CRYPTOMUS_DEFAULT_NETWORK) {
            invoiceData.network = process.env.CRYPTOMUS_DEFAULT_NETWORK;
        }

        const invoice = await cryptomusClient.createInvoice(invoiceData);

        console.log('✅ Cryptomus invoice created successfully:', {
            orderId,
            invoiceUuid: invoice.uuid,
            amount: finalPrice,
            telegram_user_id,
            invoiceUrl: invoice.url
        });

        return res.status(200).json({
            success: true,
            invoiceUrl: invoice.url,
            invoiceUuid: invoice.uuid,
            orderId: orderId,
            amount: finalPrice,
            currency: currency,
            expiresAt: invoice.expired_at,
            details: {
                cost: costPrice,
                baseMarkup,
                countryMarkup,
                cryptomusMarkup,
                finalPrice: finalPrice.toFixed(2)
            }
        });

    } catch (error) {
        console.error('❌ Error creating Cryptomus invoice:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to create invoice'
        });
    }
};
