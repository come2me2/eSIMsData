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
 * 3. Применяем базовую маржу + маржу способа оплаты
 * 4. Рассчитываем Stars с учетом комиссии Telegram
 *
 * Формула расчета:
 * finalPrice = cost × baseMarkup × starsMarkup
 * Stars = Math.ceil(finalPrice / (1 - telegram_fee) / stars_rate)
 *
 * Пример для esim_1GB_7D_AE_V2:
 * - cost = $2.26 (себестоимость)
 * - baseMarkup = 1.29 (29% базовая маржа из админки)
 * - starsMarkup = 1.05 (5% дополнительная маржа Stars из админки)
 * - finalPrice = $2.26 × 1.29 × 1.05 = $3.06
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

        if (!plan_id || !plan_type || !bundle_name || !country_code || !price) {
            return res.status(400).json({
                success: false,
                error: 'plan_id, plan_type, bundle_name, country_code and price are required'
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
            console.log('[Stars] Markup is disabled, using cost price without markup');
        }
        
        // Получаем базовую маржу (например, 1.29 = +29%)
        const baseMarkup = markup.enabled ? (markup.base || markup.defaultMultiplier || 1.0) : 1.0;
        
        // Проверяем наценку по стране
        let countryMarkup = 1.0;
        if (country_code && markup.countryMarkups && markup.countryMarkups[country_code]) {
            // Наценка по стране в процентах, конвертируем в множитель
            const countryPercent = markup.countryMarkups[country_code];
            countryMarkup = 1 + (countryPercent / 100);
            console.log(`[Stars] Country markup found for ${country_code}: ${countryPercent}% (multiplier: ${countryMarkup})`);
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
            countryCode: country_code,
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
            country_code,
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

        console.log('✅ Invoice created successfully:', {
            plan_id,
            bundle_name,
            cost: costPrice,
            finalPrice: finalPrice.toFixed(2),
            stars: amountStars,
            invoiceLink: invoiceLink.substring(0, 50) + '...'
        });

        return res.status(200).json({
            success: true,
            invoiceLink,
            amountStars,
            finalPrice: finalPrice.toFixed(2),
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

