/**
 * Telegram Stars - Create Invoice endpoint
 * Endpoint: POST /api/telegram/stars/create-invoice
 *
 * Требуется:
 * - TELEGRAM_BOT_TOKEN
 * - STARS_RATE (курс 1 Star в USD, по умолчанию 0.013)
 * - STARS_MARGIN (наша маржа в долях, по умолчанию 0.29 = 29%)
 * - STARS_TELEGRAM_FEE (комиссия Telegram в долях, по умолчанию 0.25 = 25%)
 *
 * Формула расчета:
 * Stars = (price / (1 - margin) / (1 - telegram_fee) / stars_rate)
 *
 * Пример для esim_1GB_7D_AE_V2:
 * - price = $2.26 (себестоимость)
 * - margin = 0.29 (29%)
 * - telegram_fee = 0.25 (25%)
 * - stars_rate = 0.013 ($0.013 за 1 Star)
 * - Stars = (2.26 / (1 - 0.29) / (1 - 0.25) / 0.013) ≈ 326 Stars
 */

// Загружаем переменные окружения из .env файла (на случай, если они не загружены в server.js)
const path = require('path');
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
const STARS_MARGIN = parseFloat(process.env.STARS_MARGIN || '0.29'); // 29% маржа
const STARS_TELEGRAM_FEE = parseFloat(process.env.STARS_TELEGRAM_FEE || '0.25'); // 25% комиссия Telegram
const MIN_STARS = 1;

// Логируем при загрузке модуля для диагностики
if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in create-invoice.js');
    console.error('   Available env vars:', Object.keys(process.env).filter(k => k.includes('TELEGRAM') || k.includes('BOT')));
} else {
    console.log('✅ TELEGRAM_BOT_TOKEN available in create-invoice.js:', BOT_TOKEN.substring(0, 10) + '...');
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
            price, // ⚠️ ВАЖНО: price должна быть СЕБЕСТОИМОСТЬЮ тарифа (cost), а не финальной ценой для пользователя
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

        const priceNumber = parsePrice(price);
        if (!priceNumber) {
            return res.status(400).json({ success: false, error: 'Invalid price format' });
        }

        // Формула расчета Stars с учетом маржи и комиссии Telegram:
        // Stars = (price / (1 - margin) / (1 - telegram_fee) / stars_rate)
        // 
        // Где:
        // - price = себестоимость тарифа (cost, НЕ финальная цена!)
        // - margin = наша маржа в долях (0.29 = 29%)
        // - telegram_fee = комиссия Telegram в долях (0.25 = 25%)
        // - stars_rate = курс 1 Star в USD (0.013 = $0.013)
        //
        // Пример: (2.26 / (1 - 0.29) / (1 - 0.25) / 0.013) ≈ 326 Stars
        //
        // ⚠️ ВАЖНО: price должна быть СЕБЕСТОИМОСТЬЮ (cost), а не финальной ценой!
        const amountStars = Math.max(
            MIN_STARS,
            Math.ceil(
                priceNumber / (1 - STARS_MARGIN) / (1 - STARS_TELEGRAM_FEE) / STARS_RATE
            )
        );

        console.log(`💰 Stars calculation:`, {
            price: priceNumber, // ⚠️ Должна быть себестоимость (cost), не финальная цена!
            margin: STARS_MARGIN,
            telegramFee: STARS_TELEGRAM_FEE,
            starsRate: STARS_RATE,
            calculatedStars: amountStars,
            formula: `(${priceNumber} / (1 - ${STARS_MARGIN}) / (1 - ${STARS_TELEGRAM_FEE}) / ${STARS_RATE})`
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

        const tgResult = await tgResponse.json();
        
        console.log('📋 Telegram API response:', {
            ok: tgResult.ok,
            resultType: typeof tgResult.result,
            resultLength: tgResult.result?.length,
            resultPreview: tgResult.result ? tgResult.result.substring(0, 50) + '...' : null,
            error: tgResult.error_code || tgResult.description
        });
        
        if (!tgResult.ok) {
            console.error('❌ createInvoiceLink failed:', tgResult);
            return res.status(500).json({
                success: false,
                error: tgResult.description || 'createInvoiceLink failed'
            });
        }

        console.log('✅ Invoice link created:', tgResult.result);

        return res.status(200).json({
            success: true,
            invoiceLink: tgResult.result,
            amountStars,
            payload: payloadStr
        });
    } catch (error) {
        console.error('❌ create-invoice error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};



