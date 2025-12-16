/**
 * Telegram Stars - Create Invoice endpoint
 * Endpoint: POST /api/telegram/stars/create-invoice
 *
 * Требуется:
 * - TELEGRAM_BOT_TOKEN
 * - STARS_RATE (курс Stars за 1 единицу валюты, по умолчанию 100)
 */

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const STARS_RATE = parseFloat(process.env.STARS_RATE || '100');
const MIN_STARS = 1;

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
        return res.status(500).json({ success: false, error: 'TELEGRAM_BOT_TOKEN is not set' });
    }

    try {
        const {
            plan_id,
            plan_type,
            bundle_name,
            country_code,
            country_name,
            price,
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

        const amountStars = Math.max(MIN_STARS, Math.ceil(priceNumber * STARS_RATE));

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
        if (!tgResult.ok) {
            console.error('❌ createInvoiceLink failed:', tgResult);
            return res.status(500).json({
                success: false,
                error: tgResult.description || 'createInvoiceLink failed'
            });
        }

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

