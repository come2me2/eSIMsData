/**
 * Telegram Stars - Create Invoice endpoint
 * Endpoint: POST /api/telegram/stars/create-invoice
 *
 * Требуется:
 * - TELEGRAM_BOT_TOKEN
 * - STARS_RATE (курс 1 Star в USD, по умолчанию 0.013)
 * - STARS_TELEGRAM_FEE (комиссия Telegram в долях, по умолчанию 0.25 = 25%)
 *
 * НОВАЯ ЛОГИКА:
 * 1. Получаем СЕБЕСТОИМОСТЬ (cost) от клиента
 * 2. Загружаем настройки наценок из админки
 * 3. Применяем базовую маржу + наценку по стране (если есть) + маржу способа оплаты
 * 4. Рассчитываем Stars с учетом комиссии Telegram
 *
 * Формула расчета:
 * finalPrice = cost × baseMarkup × countryMarkup × starsMarkup
 * Stars = Math.ceil(finalPrice / (1 - telegram_fee) / stars_rate)
 *
 * Пример для esim_1GB_7D_AE_V2:
 * - cost = $2.26 (себестоимость)
 * - baseMarkup = 1.29 (29% базовая маржа из админки)
 * - countryMarkup = 1.0 (наценка по стране, если установлена в админке)
 * - starsMarkup = 1.05 (5% дополнительная маржа Stars из админки)
 * - finalPrice = $2.26 × 1.29 × 1.0 × 1.05 = $3.06
 * - Stars = $3.06 / (1 - 0.25) / 0.013 ≈ 314 Stars
 */

const path = require('path');
const fs = require('fs').promises;

// Загружаем переменные окружения из .env файла
if (!process.env.TELEGRAM_BOT_TOKEN && !process.env.BOT_TOKEN) {
    try {
        require('dotenv').config({ path: path.join(__dirname, '../../.env') });
    } catch (e) {
        // Игнорируем ошибки загрузки .env
    }
}

// Загружаем переменные окружения с проверкой
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
const STARS_RATE = parseFloat(process.env.STARS_RATE || '0.013'); // 1 Star = $0.013
const STARS_TELEGRAM_FEE = parseFloat(process.env.STARS_TELEGRAM_FEE || '0.25'); // 25% комиссия Telegram
const MIN_STARS = 1;

// Файл с настройками админки
const SETTINGS_FILE = path.join(__dirname, '..', '..', 'data', 'admin-settings.json');

// Логируем при загрузке модуля для диагностики
if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in create-invoice.js');
    console.error('   Available env vars:', Object.keys(process.env).filter(k => k.includes('TELEGRAM') || k.includes('BOT')));
} else {
    console.log('✅ TELEGRAM_BOT_TOKEN available in create-invoice.js:', BOT_TOKEN.substring(0, 10) + '...');
}

// Загрузить настройки наценок из админки
async function loadMarkupSettings() {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Настройки по умолчанию
            console.log('[Stars] Using default markup settings');
            return {
                markup: {
                    enabled: true,
                    base: 1.29,
                    defaultMultiplier: 1.29
                },
                paymentMethods: {
                    telegramStars: { 
                        enabled: true,
                        markup: 1.05,
                        markupMultiplier: 1.05
                    }
                }
            };
        }
        console.error('[Stars] Error loading markup settings:', error);
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

function buildPayload(data) {
    const payload = {
        pid: data.plan_id,
        pt: data.plan_type,
        bn: data.bundle_name,
        cc: data.country_code,
        cn: data.country_name,
        uid: data.telegram_user_id,
        amt: data.amountStars,
        cur: 'XTR'
    };

    let payloadStr = JSON.stringify(payload);

    // Если payload слишком длинный, убираем необязательные поля
    if (payloadStr.length > 120) {
        delete payload.cn;
        payloadStr = JSON.stringify(payload);
    }

    return payloadStr;
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

    if (!BOT_TOKEN) {
        console.error('❌ TELEGRAM_BOT_TOKEN is not set in create-invoice handler');
        console.error('   process.env.TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'SET' : 'NOT SET');
        console.error('   process.env.BOT_TOKEN:', process.env.BOT_TOKEN ? 'SET' : 'NOT SET');
        return res.status(500).json({ 
            success: false, 
            error: 'TELEGRAM_BOT_TOKEN is not configured. Please set TELEGRAM_BOT_TOKEN environment variable on the server.' 
        });
    }

    try {
        // ✅ ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ для отладки Region/Global планов
        console.log('[Stars] ========================================');
        console.log('[Stars] Request received:', {
            method: req.method,
            url: req.url,
            body: req.body,
            headers: {
                'content-type': req.headers['content-type'],
                'user-agent': req.headers['user-agent']
            }
        });
        console.log('[Stars] ========================================');
        
        const {
            plan_id,
            plan_type,
            bundle_name,
            country_code,
            country_name,
            price, // ✅ НОВАЯ ЛОГИКА: price = себестоимость (cost) от eSIM GO
            currency = 'USD',
            telegram_user_id,
            telegram_username
        } = req.body || {};

        // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Если country_code пустой, генерируем его на сервере
        let finalCountryCode = (country_code && String(country_code).trim() !== '') ? String(country_code).trim() : null;
        
        if (!finalCountryCode && country_name) {
            const countryName = String(country_name).trim();
            
            // Маппинг регионов и Global
            if (countryName.toLowerCase() === 'global') {
                finalCountryCode = 'GLOBAL';
                console.log('[Stars] Generated country_code from country_name (Global):', finalCountryCode);
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
                console.log('[Stars] Generated country_code from country_name (Region):', {
                    countryName: countryName,
                    generatedCode: finalCountryCode
                });
            }
        }
        
        // ✅ ДЕТАЛЬНАЯ ПРОВЕРКА каждого поля с логированием
        const missingFields = [];
        if (!plan_id) missingFields.push('plan_id');
        if (!plan_type) missingFields.push('plan_type');
        if (!bundle_name) missingFields.push('bundle_name');
        if (!finalCountryCode) missingFields.push('country_code');
        if (!price) missingFields.push('price');
        
        if (missingFields.length > 0) {
            console.error('[Stars] ❌ Missing required fields:', {
                missingFields,
                receivedData: {
                    plan_id: plan_id || 'MISSING',
                    plan_type: plan_type || 'MISSING',
                    bundle_name: bundle_name || 'MISSING',
                    country_code: country_code || 'MISSING',
                    country_name: country_name || 'MISSING',
                    price: price || 'MISSING',
                    currency: currency || 'MISSING',
                    telegram_user_id: telegram_user_id || 'MISSING',
                    telegram_username: telegram_username || 'MISSING'
                },
                fullBody: req.body
            });
            
            return res.status(400).json({
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}. Received: ${JSON.stringify({
                    plan_id: plan_id || null,
                    plan_type: plan_type || null,
                    bundle_name: bundle_name || null,
                    country_code: country_code || null,
                    price: price || null
                })}`
            });
        }
        
        console.log('[Stars] ✅ All required fields present:', {
            plan_id,
            plan_type,
            bundle_name,
            country_code,
            country_name,
            price,
            currency,
            telegram_user_id,
            telegram_username
        });

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
            console.log('[Stars] Markup is disabled, using cost price without markup');
        }
        
        // Получаем базовую маржу (например, 1.29 = +29%)
        const baseMarkup = markup.enabled ? (markup.base || markup.defaultMultiplier || 1.0) : 1.0;
        
        // Используем finalCountryCode вместо country_code
        const countryCodeForMarkup = finalCountryCode || country_code;
        
        // Проверяем наценку по стране
        let countryMarkup = 1.0;
        if (countryCodeForMarkup && markup.countryMarkups && markup.countryMarkups[countryCodeForMarkup]) {
            // Наценка по стране в процентах, конвертируем в множитель
            const countryPercent = markup.countryMarkups[countryCodeForMarkup];
            countryMarkup = 1 + (countryPercent / 100);
            console.log(`[Stars] Country markup found for ${countryCodeForMarkup}: ${countryPercent}% (multiplier: ${countryMarkup})`);
        }
        
        // Получаем маржу для Telegram Stars (например, 1.05 = +5%)
        const starsMethod = paymentMethods.telegramStars || {};
        const starsMarkup = starsMethod.enabled ? (starsMethod.markupMultiplier || starsMethod.markup || 1.0) : 1.0;
        
        // ✅ Рассчитываем финальную цену со всеми наценками
        // finalPrice = себестоимость × базовая маржа × наценка по стране × маржа Stars
        const finalPrice = costPrice * baseMarkup * countryMarkup * starsMarkup;
        
        console.log('[Stars] Price calculation:', {
            cost: costPrice,
            baseMarkup: baseMarkup,
            countryMarkup: countryMarkup,
            countryCode: finalCountryCode || country_code,
            originalCountryCode: country_code,
            generatedCountryCode: finalCountryCode,
            starsMarkup: starsMarkup,
            finalPrice: finalPrice.toFixed(2),
            formula: `${costPrice} × ${baseMarkup} × ${countryMarkup} × ${starsMarkup} = ${finalPrice.toFixed(2)}`
        });

        // ✅ НОВАЯ ФОРМУЛА: Stars = finalPrice / (1 - telegram_fee) / stars_rate
        // Эта формула учитывает:
        // 1. Финальная цена уже содержит обе наценки (базовую + Stars)
        // 2. Комиссию Telegram 25% (из Stars вычитается, мы получаем 75%)
        // 3. Курс Stars ($0.013 за 1 Star)
        //
        // Пример: $3.06 / 0.75 / 0.013 ≈ 314 Stars
        // Проверка: 314 × $0.013 = $4.08, после комиссии Telegram (25%): $4.08 × 0.75 = $3.06 ✅
        const amountStars = Math.max(
            MIN_STARS,
            Math.ceil(
                finalPrice / (1 - STARS_TELEGRAM_FEE) / STARS_RATE
            )
        );

        console.log(`💰 Stars calculation:`, {
            cost: costPrice,
            baseMarkup: baseMarkup,
            countryMarkup: countryMarkup,
            countryCode: country_code,
            starsMarkup: starsMarkup,
            finalPrice: finalPrice.toFixed(2),
            telegramFee: STARS_TELEGRAM_FEE,
            starsRate: STARS_RATE,
            calculatedStars: amountStars,
            formula: `Math.ceil(${finalPrice.toFixed(2)} / (1 - ${STARS_TELEGRAM_FEE}) / ${STARS_RATE})`,
            verification: `${amountStars} Stars × ${STARS_RATE} = $${(amountStars * STARS_RATE).toFixed(2)}, after TG fee (${STARS_TELEGRAM_FEE * 100}%): $${(amountStars * STARS_RATE * (1 - STARS_TELEGRAM_FEE)).toFixed(2)}`
        });

        const payloadStr = buildPayload({
            plan_id,
            plan_type,
            bundle_name,
            country_code: finalCountryCode || country_code, // Используем сгенерированный код
            country_name,
            telegram_user_id,
            amountStars
        });

        const title = 'eSIM plan';
        const description = `${country_name || country_code} • ${plan_type}`;

        const tgResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                description,
                payload: payloadStr,
                currency: 'XTR',
                prices: [
                    {
                        label: 'eSIM plan',
                        amount: amountStars
                    }
                ],
                provider_token: '', // Для Stars не требуется
                need_name: false,
                need_email: false,
                need_phone_number: false
            })
        });

        if (!tgResponse.ok) {
            const errorText = await tgResponse.text();
            console.error('❌ Telegram API error:', {
                status: tgResponse.status,
                statusText: tgResponse.statusText,
                response: errorText
            });
            return res.status(500).json({ 
                success: false, 
                error: `Telegram API error: ${tgResponse.status} ${tgResponse.statusText}` 
            });
        }

        const tgData = await tgResponse.json();

        if (!tgData.ok) {
            console.error('❌ Telegram API returned error:', tgData);
            return res.status(500).json({ 
                success: false, 
                error: tgData.description || 'Failed to create invoice' 
            });
        }

        const invoiceLink = tgData.result;
        
        // Извлекаем invoice ID из ссылки (формат: https://t.me/invoice/INVOICE_ID)
        const invoiceIdMatch = invoiceLink.match(/\/invoice\/([^\/\?]+)/);
        const invoiceId = invoiceIdMatch ? invoiceIdMatch[1] : null;
        
        // Создаем заказ со статусом on_hold (БЕЗ создания в eSIM Go)
        // Заказ будет создан в eSIM Go только после подтверждения платежа
        try {
            const ordersHandler = require('../orders');
            const orderReq = {
                method: 'POST',
                body: {
                    telegram_user_id: telegram_user_id,
                    orderReference: `pending_${invoiceId || Date.now()}`, // Временный ID, будет заменен после оплаты
                    status: 'on_hold',
                    payment_method: 'telegram_stars',
                    payment_session_id: invoiceId,
                    payment_status: 'pending',
                    country_code: finalCountryCode || country_code,
                    country_name: country_name,
                    plan_id: plan_id,
                    plan_type: plan_type,
                    bundle_name: bundle_name,
                    price: finalPrice,
                    currency: currency,
                    provider_base_price_usd: costPrice,
                    provider_product_id: bundle_name,
                    source: 'telegram_mini_app',
                    customer: telegram_user_id,
                    // Таймаут: 5 минут для Telegram Stars
                    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                    createdAt: new Date().toISOString()
                }
            };
            
            const orderRes = {
                status: (code) => ({ json: (data) => {} }),
                setHeader: () => {},
                statusCode: 200
            };
            
            await ordersHandler(orderReq, orderRes);
            
            console.log('✅ Order created with status on_hold:', {
                invoiceId,
                telegram_user_id,
                bundle_name,
                expires_at: orderReq.body.expires_at
            });
        } catch (orderError) {
            console.error('⚠️ Failed to create on_hold order:', orderError);
            // Не блокируем создание invoice, но логируем ошибку
        }

        console.log('✅ Invoice created successfully:', {
            plan_id,
            bundle_name,
            cost: costPrice,
            finalPrice: finalPrice.toFixed(2),
            stars: amountStars,
            invoiceLink: invoiceLink.substring(0, 50) + '...',
            invoiceId: invoiceId
        });

        return res.status(200).json({
            success: true,
            invoiceLink,
            amountStars,
            finalPrice: finalPrice.toFixed(2),
            invoiceId: invoiceId, // Возвращаем invoice ID для отслеживания
            details: {
                cost: costPrice,
                baseMarkup,
                starsMarkup,
                finalPrice: finalPrice.toFixed(2)
            }
        });
    } catch (error) {
        console.error('❌ Error creating Telegram Stars invoice:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to create invoice'
        });
    }
};

