# 💳 План интеграции Cryptomus для оплаты eSIM и Extend

## 📋 Обзор

Интеграция Cryptomus позволит пользователям оплачивать eSIM и докупать трафик (extend) через криптовалютные платежи. Интеграция должна работать параллельно с Telegram Stars и поддерживать все те же функции.

---

## 🎯 Цели интеграции

1. ✅ Позволить пользователям оплачивать eSIM через Cryptomus (криптовалютные платежи)
2. ✅ Поддержать функционал Extend (докупка трафика) через Cryptomus
3. ✅ Сохранить совместимость с существующей системой Telegram Stars
4. ✅ Обеспечить безопасность и валидацию платежей
5. ✅ Поддержать все наценки и расчеты цен (как в Telegram Stars)

---

## 📚 Этап 1: Изучение Cryptomus API

### 1.1 Основные методы Cryptomus API

**Документация**: https://doc.cryptomus.com/

#### Создание Invoice
- **Endpoint**: `POST https://api.cryptomus.com/v1/payment`
- **Метод**: `createInvoice`
- **Параметры**:
  - `amount` - сумма в фиатной валюте (USD)
  - `currency` - валюта платежа (USD)
  - `order_id` - уникальный ID заказа
  - `url_callback` - URL для webhook уведомлений
  - `url_return` - URL для возврата после оплаты
  - `to_currency` - криптовалюта для оплаты (USDT, BTC, ETH и т.д.)
  - `network` - сеть блокчейна (tron, ethereum, bitcoin и т.д.)
  - `lifetime` - время жизни инвойса в секундах (по умолчанию 3600)

#### Получение статуса платежа
- **Endpoint**: `GET https://api.cryptomus.com/v1/payment/{uuid}`
- **Метод**: `getPaymentInfo`

#### Webhook уведомления
- **URL**: Настраивается в `url_callback` при создании invoice
- **Метод**: `POST` с JSON телом
- **Проверка подписи**: MD5(base64(JSON без поля sign) + API_PAYMENT_KEY)

### 1.2 Структура данных Cryptomus

#### Запрос создания invoice:
```json
{
  "amount": "25.00",
  "currency": "USD",
  "order_id": "esim_order_12345",
  "url_callback": "https://yourdomain.com/api/cryptomus/webhook",
  "url_return": "https://yourdomain.com/checkout?order_id=esim_order_12345",
  "to_currency": "USDT",
  "network": "tron",
  "lifetime": 3600
}
```

#### Ответ создания invoice:
```json
{
  "state": 0,
  "result": {
    "uuid": "invoice-uuid-here",
    "order_id": "esim_order_12345",
    "amount": "25.00",
    "currency": "USD",
    "merchant_amount": "24.80",
    "network": "tron",
    "address": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    "from": null,
    "txid": null,
    "payment_status": "waiting",
    "url": "https://pay.cryptomus.com/pay/invoice-uuid-here",
    "expired_at": 1234567890,
    "status": "process",
    "is_final": false,
    "network": "tron",
    "payer_currency": "USDT"
  }
}
```

#### Webhook уведомление:
```json
{
  "type": "payment",
  "uuid": "invoice-uuid-here",
  "order_id": "esim_order_12345",
  "amount": "25.00",
  "payment_amount": "25.00",
  "merchant_amount": "24.80",
  "commission": "0.20",
  "status": "paid",
  "is_final": true,
  "currency": "USD",
  "payer_currency": "USDT",
  "network": "tron",
  "from": "wallet_address",
  "txid": "transaction_hash",
  "sign": "hash-signature"
}
```

---

## 🔄 Этап 2: Анализ текущей реализации Telegram Stars

### 2.1 Ключевые компоненты Telegram Stars

1. **Создание инвойса**: `api/telegram/stars/create-invoice.js`
   - Расчет финальной цены с наценками
   - Создание payload с данными заказа
   - Создание заказа со статусом `on_hold`

2. **Обработка webhook**: `api/telegram/stars/webhook.js`
   - Обработка `pre_checkout_query`
   - Обработка `successful_payment`
   - Создание заказа в eSIM Go
   - Сохранение заказа в базу данных
   - Отправка QR кода пользователю

3. **Frontend**: `public/checkout.js`
   - Выбор способа оплаты
   - Инициация платежа через Stars
   - Обработка Extend режима

### 2.2 Нюансы, которые нужно учесть для Cryptomus

1. **Расчет цены**:
   - Используется себестоимость (cost) от eSIM Go
   - Применяются наценки: базовая маржа + наценка по стране + наценка способа оплаты
   - Формула: `finalPrice = cost × baseMarkup × countryMarkup × cryptomusMarkup`

2. **Payload для заказа**:
   - Компактный формат для экономии места
   - Включает: plan_id, plan_type, bundle_name, country_code, country_name, finalPrice, iccid (для extend)

3. **Extend режим**:
   - Передается `iccid` существующей eSIM
   - При создании заказа в eSIM Go используется `iccid` для добавления трафика

4. **Статусы заказа**:
   - `on_hold` - заказ создан, ожидает оплаты
   - `completed` - оплата подтверждена, eSIM выдана
   - `failed` - ошибка при создании заказа или оплате

5. **Таймауты**:
   - Для Cryptomus: 60 минут (3600 секунд)

---

## 🏗️ Этап 3: Архитектура интеграции

### 3.1 Структура файлов

```
api/
  cryptomus/
    create-invoice.js      # Создание Cryptomus invoice
    webhook.js              # Обработка Cryptomus webhooks
  _lib/
    cryptomus/
      client.js             # Клиент для Cryptomus API
```

### 3.2 Поток оплаты через Cryptomus

```
1. Пользователь выбирает способ оплаты "Cryptomus" в checkout
2. Frontend вызывает /api/cryptomus/create-invoice
3. Backend:
   - Рассчитывает финальную цену с наценками
   - Создает заказ со статусом on_hold
   - Создает invoice в Cryptomus API
   - Возвращает URL для оплаты
4. Frontend перенаправляет пользователя на страницу оплаты Cryptomus
5. Пользователь оплачивает криптовалютой
6. Cryptomus отправляет webhook на /api/cryptomus/webhook
7. Backend:
   - Проверяет подпись webhook
   - Проверяет статус платежа (paid, is_final)
   - Создает заказ в eSIM Go (или добавляет трафик для extend)
   - Обновляет заказ в базе данных
   - Отправляет QR код пользователю в Telegram
```

### 3.3 Поток для Extend через Cryptomus

```
1. Пользователь нажимает "Extend" в Current eSIM
2. Переход на checkout?extend=true&iccid=...
3. Выбор Cryptomus как способа оплаты
4. Создание invoice с iccid в order_id или дополнительных данных
5. После оплаты webhook получает order_id с iccid
6. Создание заказа в eSIM Go с параметром iccid (добавление трафика)
7. Обновление данных в Current eSIM (через api/esimgo/bundles)
```

---

## 💻 Этап 4: Реализация

### 4.1 Переменные окружения

Добавить в `.env`:
```env
# Cryptomus API
CRYPTOMUS_MERCHANT_ID=your-merchant-uuid
CRYPTOMUS_API_KEY=your-payment-api-key
CRYPTOMUS_WEBHOOK_SECRET=your-webhook-secret
CRYPTOMUS_DEFAULT_CURRENCY=USDT
CRYPTOMUS_DEFAULT_NETWORK=tron
CRYPTOMUS_INVOICE_LIFETIME=3600
```

### 4.2 Клиент Cryptomus API

**Файл**: `api/_lib/cryptomus/client.js`

```javascript
const crypto = require('crypto');

class CryptomusClient {
    constructor() {
        this.merchantId = process.env.CRYPTOMUS_MERCHANT_ID;
        this.apiKey = process.env.CRYPTOMUS_API_KEY;
        this.baseUrl = 'https://api.cryptomus.com/v1';
    }

    /**
     * Генерирует подпись для запроса
     */
    generateSign(payload) {
        const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
        const sign = crypto
            .createHash('md5')
            .update(payloadBase64 + this.apiKey)
            .digest('hex');
        return sign;
    }

    /**
     * Создает invoice в Cryptomus
     */
    async createInvoice(data) {
        const payload = {
            amount: data.amount,
            currency: data.currency || 'USD',
            order_id: data.order_id,
            url_callback: data.url_callback,
            url_return: data.url_return,
            to_currency: data.to_currency || process.env.CRYPTOMUS_DEFAULT_CURRENCY || 'USDT',
            network: data.network || process.env.CRYPTOMUS_DEFAULT_NETWORK || 'tron',
            lifetime: data.lifetime || parseInt(process.env.CRYPTOMUS_INVOICE_LIFETIME || '3600')
        };

        const sign = this.generateSign(payload);

        const response = await fetch(`${this.baseUrl}/payment`, {
            method: 'POST',
            headers: {
                'merchant': this.merchantId,
                'sign': sign,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Cryptomus API error: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        
        if (result.state !== 0) {
            throw new Error(`Cryptomus API error: ${result.message || 'Unknown error'}`);
        }

        return result.result;
    }

    /**
     * Получает информацию о платеже
     */
    async getPaymentInfo(uuid) {
        const payload = {};
        const sign = this.generateSign(payload);

        const response = await fetch(`${this.baseUrl}/payment/${uuid}`, {
            method: 'GET',
            headers: {
                'merchant': this.merchantId,
                'sign': sign
            }
        });

        if (!response.ok) {
            throw new Error(`Cryptomus API error: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.state !== 0) {
            throw new Error(`Cryptomus API error: ${result.message || 'Unknown error'}`);
        }

        return result.result;
    }

    /**
     * Проверяет подпись webhook
     */
    verifyWebhookSignature(data, signature) {
        // Удаляем поле sign из данных для проверки
        const { sign, ...dataWithoutSign } = data;
        const payloadBase64 = Buffer.from(JSON.stringify(dataWithoutSign)).toString('base64');
        const expectedSign = crypto
            .createHash('md5')
            .update(payloadBase64 + this.apiKey)
            .digest('hex');
        
        return expectedSign === signature;
    }
}

module.exports = new CryptomusClient();
```

### 4.3 Создание Invoice

**Файл**: `api/cryptomus/create-invoice.js`

```javascript
const cryptomusClient = require('../_lib/cryptomus/client');
const path = require('path');
const fs = require('fs').promises;

// Загружаем настройки наценок
const SETTINGS_FILE = path.join(__dirname, '..', '..', 'data', 'admin-settings.json');

async function loadMarkupSettings() {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {
                markup: { enabled: true, base: 1.29 },
                paymentMethods: {
                    crypto: { enabled: true, markup: 1.0 }
                }
            };
        }
        throw error;
    }
}

module.exports = async function handler(req, res) {
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
            iccid // для extend mode
        } = req.body || {};

        // Валидация обязательных полей
        if (!plan_id || !plan_type || !bundle_name || !price || !telegram_user_id) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Загружаем настройки наценок
        const settings = await loadMarkupSettings();
        const markup = settings.markup || {};
        const paymentMethods = settings.paymentMethods || {};

        // Расчет финальной цены (как в Telegram Stars)
        const costPrice = parseFloat(price);
        const baseMarkup = markup.enabled ? (markup.base || 1.0) : 1.0;
        
        let countryMarkup = 1.0;
        if (country_code && markup.countryMarkups && markup.countryMarkups[country_code]) {
            const countryPercent = markup.countryMarkups[country_code];
            countryMarkup = 1 + (countryPercent / 100);
        }

        const cryptoMethod = paymentMethods.crypto || {};
        const cryptomusMarkup = cryptoMethod.enabled ? (cryptoMethod.markupMultiplier || cryptoMethod.markup || 1.0) : 1.0;

        const finalPrice = costPrice * baseMarkup * countryMarkup * cryptomusMarkup;

        // Генерируем уникальный order_id
        const orderId = `cryptomus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Создаем заказ со статусом on_hold
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
                country_code: country_code,
                country_name: country_name,
                plan_id: plan_id,
                plan_type: plan_type,
                bundle_name: bundle_name,
                price: finalPrice,
                finalPrice: finalPrice,
                currency: currency,
                provider_base_price_usd: costPrice,
                iccid: iccid || undefined,
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

        // Создаем invoice в Cryptomus
        const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}`
            : process.env.BASE_URL || 'https://yourdomain.com';

        const invoice = await cryptomusClient.createInvoice({
            amount: finalPrice.toFixed(2),
            currency: currency,
            order_id: orderId,
            url_callback: `${baseUrl}/api/cryptomus/webhook`,
            url_return: `${baseUrl}/checkout?order_id=${orderId}&payment_method=cryptomus`,
            to_currency: process.env.CRYPTOMUS_DEFAULT_CURRENCY || 'USDT',
            network: process.env.CRYPTOMUS_DEFAULT_NETWORK || 'tron',
            lifetime: parseInt(process.env.CRYPTOMUS_INVOICE_LIFETIME || '3600')
        });

        console.log('✅ Cryptomus invoice created:', {
            orderId,
            invoiceUuid: invoice.uuid,
            amount: finalPrice,
            telegram_user_id
        });

        return res.status(200).json({
            success: true,
            invoiceUrl: invoice.url,
            invoiceUuid: invoice.uuid,
            orderId: orderId,
            amount: finalPrice,
            currency: currency,
            expiresAt: invoice.expired_at
        });

    } catch (error) {
        console.error('❌ Error creating Cryptomus invoice:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to create invoice'
        });
    }
};
```

### 4.4 Обработка Webhook

**Файл**: `api/cryptomus/webhook.js`

```javascript
const cryptomusClient = require('../_lib/cryptomus/client');
const createOrderHandler = require('../esimgo/order');

// Идемпотентность
const processedPayments = new Set();

function createMockReq(body = {}) {
    return {
        method: 'POST',
        body,
        headers: {},
        query: {}
    };
}

function createMockRes() {
    return {
        statusCode: 200,
        data: null,
        headers: {},
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.data = payload;
            return this;
        },
        setHeader(key, value) {
            this.headers[key] = value;
        },
        end() {
            return this;
        }
    };
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Сразу отвечаем Cryptomus, чтобы не было таймаута
    res.status(200).json({ success: true });

    try {
        const webhookData = req.body;

        console.log('📥 Cryptomus webhook received:', {
            type: webhookData.type,
            order_id: webhookData.order_id,
            status: webhookData.status,
            is_final: webhookData.is_final
        });

        // Проверяем подпись
        const signature = webhookData.sign;
        if (!cryptomusClient.verifyWebhookSignature(webhookData, signature)) {
            console.error('❌ Invalid webhook signature');
            return;
        }

        // Проверяем, что это финальный статус и платеж оплачен
        if (webhookData.status !== 'paid' || !webhookData.is_final) {
            console.log('ℹ️ Payment not final or not paid yet:', {
                status: webhookData.status,
                is_final: webhookData.is_final
            });
            return;
        }

        // Проверяем на дубликаты
        const paymentId = webhookData.uuid || webhookData.order_id;
        if (processedPayments.has(paymentId)) {
            console.log('⚠️ Duplicate payment detected:', paymentId);
            return;
        }
        processedPayments.add(paymentId);

        // Извлекаем order_id и находим заказ on_hold
        const orderId = webhookData.order_id;
        if (!orderId || !orderId.startsWith('cryptomus_')) {
            console.error('❌ Invalid order_id in webhook');
            return;
        }

        // Загружаем заказ из базы данных
        const fs = require('fs').promises;
        const path = require('path');
        const ORDERS_FILE = path.join(__dirname, '..', '..', 'data', 'orders.json');
        
        const ordersData = await fs.readFile(ORDERS_FILE, 'utf8');
        const allOrders = JSON.parse(ordersData);

        let existingOrder = null;
        let telegramUserId = null;

        // Ищем заказ по payment_session_id
        for (const userId in allOrders) {
            if (!Array.isArray(allOrders[userId])) continue;
            
            existingOrder = allOrders[userId].find(o => 
                o.payment_session_id === orderId ||
                o.orderReference === `pending_${orderId}`
            );
            
            if (existingOrder) {
                telegramUserId = userId;
                break;
            }
        }

        if (!existingOrder) {
            console.error('❌ Order not found:', orderId);
            return;
        }

        console.log('✅ Found existing order:', {
            orderReference: existingOrder.orderReference,
            telegram_user_id: telegramUserId,
            iccid: existingOrder.iccid || 'NEW ESIM'
        });

        // Создаем заказ в eSIM Go
        const orderReq = createMockReq({
            bundle_name: existingOrder.bundle_name,
            telegram_user_id: telegramUserId,
            telegram_username: existingOrder.telegram_username,
            iccid: existingOrder.iccid || null, // для extend mode
            country_code: existingOrder.country_code,
            country_name: existingOrder.country_name,
            plan_id: existingOrder.plan_id,
            plan_type: existingOrder.plan_type,
            test_mode: false
        });

        const orderRes = createMockRes();

        await Promise.resolve(createOrderHandler(orderReq, orderRes));

        const success = orderRes.statusCode === 200 && orderRes.data && orderRes.data.success;

        if (success) {
            const orderData = orderRes.data.data;
            const orderRef = orderData.orderReference || orderData.reference;

            // Получаем assignments (QR код, ICCID и т.д.)
            let assignments = orderData.assignments || null;
            
            if (!assignments && orderRef) {
                try {
                    const esimgoClient = require('../../_lib/esimgo/client');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    assignments = await esimgoClient.getESIMAssignments(orderRef, 'qrCode');
                } catch (error) {
                    console.warn('⚠️ Failed to get assignments:', error.message);
                }
            }

            // Обновляем заказ в базе данных
            const ordersHandler = require('../orders');
            const saveOrderReq = {
                telegram_user_id: telegramUserId,
                orderReference: orderRef,
                iccid: assignments?.iccid || null,
                matchingId: assignments?.matchingId || null,
                smdpAddress: assignments?.smdpAddress || null,
                qrCode: assignments?.qrCode || null,
                country_code: existingOrder.country_code,
                country_name: existingOrder.country_name,
                plan_id: existingOrder.plan_id,
                plan_type: existingOrder.plan_type,
                bundle_name: existingOrder.bundle_name,
                price: existingOrder.finalPrice || existingOrder.price,
                finalPrice: existingOrder.finalPrice || existingOrder.price,
                currency: existingOrder.currency || 'USD',
                status: assignments?.iccid ? 'completed' : 'on_hold',
                payment_method: 'cryptomus',
                payment_session_id: orderId,
                payment_status: 'succeeded',
                payment_confirmed: true,
                esim_issued: !!assignments?.iccid,
                createdAt: existingOrder.createdAt,
                updatedAt: new Date().toISOString()
            };

            const saveOrderRes = createMockRes();
            await Promise.resolve(ordersHandler(createMockReq(saveOrderReq), saveOrderRes));

            // Отправляем сообщение пользователю в Telegram
            if (assignments && (assignments.iccid || assignments.matchingId)) {
                const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
                if (BOT_TOKEN) {
                    let esimMessage = `📱 <b>Your eSIM data:</b>\n\n`;
                    if (assignments.iccid) {
                        esimMessage += `ICCID: <code>${assignments.iccid}</code>\n`;
                    }
                    if (assignments.matchingId) {
                        esimMessage += `Matching ID: <code>${assignments.matchingId}</code>\n`;
                    }
                    if (assignments.smdpAddress) {
                        esimMessage += `RSP URL: <code>${assignments.smdpAddress}</code>\n`;
                    }

                    try {
                        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: telegramUserId,
                                text: esimMessage,
                                parse_mode: 'HTML'
                            })
                        });

                        // Отправляем QR код если есть
                        if (assignments.qrCode) {
                            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    chat_id: telegramUserId,
                                    photo: assignments.qrCode,
                                    caption: 'QR code for eSIM activation'
                                })
                            });
                        }
                    } catch (error) {
                        console.error('❌ Error sending message to user:', error);
                    }
                }
            }

            console.log('✅ Cryptomus payment processed successfully:', {
                orderId,
                orderReference: orderRef,
                telegram_user_id: telegramUserId
            });
        } else {
            console.error('❌ Failed to create order in eSIM Go');
        }

    } catch (error) {
        console.error('❌ Error processing Cryptomus webhook:', error);
    }
};
```

### 4.5 Обновление Frontend

**Файл**: `public/checkout.js`

Добавить функцию для инициации платежа через Cryptomus:

```javascript
async function handlePurchaseWithCryptomus(auth) {
    if (!auth || !auth.id) {
        showCustomAlert('Please authorize first');
        return;
    }

    const selectedPlan = getSelectedPlan();
    if (!selectedPlan) {
        showCustomAlert('Please select a plan');
        return;
    }

    // Находим bundle_name
    const bundleName = await findBundleName(
        orderData.code,
        selectedPlan.dataAmount,
        selectedPlan.duration,
        selectedPlan.unlimited
    );

    if (!bundleName) {
        showCustomAlert('Plan not found. Please try again.');
        return;
    }

    // Рассчитываем цену
    const costPrice = parseFloat(selectedPlan.price);
    const finalPrice = calculateFinalPrice(costPrice, 'cryptomus');

    // Создаем invoice
    try {
        const response = await fetch('/api/cryptomus/create-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plan_id: selectedPlan.id,
                plan_type: selectedPlan.unlimited ? 'unlimited' : 'standard',
                bundle_name: bundleName,
                country_code: orderData.code,
                country_name: orderData.name,
                price: costPrice,
                currency: 'USD',
                telegram_user_id: auth.id,
                telegram_username: auth.username,
                iccid: orderData.extend && orderData.iccid ? orderData.iccid.trim() : undefined
            })
        });

        const result = await response.json();

        if (!result.success) {
            showCustomAlert(result.error || 'Failed to create payment');
            return;
        }

        // Перенаправляем на страницу оплаты Cryptomus
        window.location.href = result.invoiceUrl;

    } catch (error) {
        console.error('Error creating Cryptomus invoice:', error);
        showCustomAlert('Payment error. Please try again.');
    }
}
```

Обновить функцию `handlePurchase`:

```javascript
async function handlePurchase(auth) {
    if (selectedPaymentMethod === 'stars') {
        await handlePurchaseWithStars(auth);
    } else if (selectedPaymentMethod === 'cryptomus') {
        await handlePurchaseWithCryptomus(auth);
    } else {
        showCustomAlert('Please select a payment method');
    }
}
```

### 4.6 Добавление роутов в server.js

```javascript
// Cryptomus routes
app.post('/api/cryptomus/create-invoice', require('./api/cryptomus/create-invoice'));
app.post('/api/cryptomus/webhook', require('./api/cryptomus/webhook'));
```

---

## 🧪 Этап 5: Тестирование

### 5.1 Тестовые сценарии

1. **Покупка eSIM через Cryptomus**:
   - Выбор плана
   - Выбор Cryptomus как способа оплаты
   - Создание invoice
   - Оплата (тестовый платеж)
   - Проверка webhook
   - Проверка создания заказа в eSIM Go
   - Проверка получения QR кода

2. **Extend через Cryptomus**:
   - Переход на Extend
   - Выбор Cryptomus
   - Создание invoice с iccid
   - Оплата
   - Проверка добавления трафика к существующей eSIM

3. **Обработка ошибок**:
   - Просроченный invoice
   - Отмена платежа
   - Неверная подпись webhook
   - Ошибка создания заказа в eSIM Go

### 5.2 Тестовые данные Cryptomus

Использовать тестовый режим Cryptomus (если доступен) или тестовые кошельки.

---

## 📝 Этап 6: Документация и настройка

### 6.1 Настройка Cryptomus

1. Зарегистрироваться на https://cryptomus.com
2. Получить `merchant_uuid` и `api_key`
3. Настроить webhook URL: `https://yourdomain.com/api/cryptomus/webhook`
4. Добавить переменные окружения в `.env`

### 6.2 Обновление админки

Добавить настройки для Cryptomus в админке:
- Включение/выключение метода оплаты
- Наценка для Cryptomus (по аналогии с Telegram Stars)

---

## ✅ Чеклист реализации

- [ ] Создать `api/_lib/cryptomus/client.js`
- [ ] Создать `api/cryptomus/create-invoice.js`
- [ ] Создать `api/cryptomus/webhook.js`
- [ ] Добавить роуты в `server.js`
- [ ] Обновить `public/checkout.js` для поддержки Cryptomus
- [ ] Добавить переменные окружения
- [ ] Протестировать создание invoice
- [ ] Протестировать webhook
- [ ] Протестировать Extend режим
- [ ] Обновить админку для настройки Cryptomus
- [ ] Добавить документацию

---

## 🔒 Безопасность

1. **Проверка подписи webhook**: Всегда проверять подпись от Cryptomus
2. **Идемпотентность**: Предотвращать обработку дубликатов платежей
3. **Валидация данных**: Проверять все входящие данные
4. **Таймауты**: Устанавливать правильные таймауты для invoice
5. **Логирование**: Логировать все операции для отладки

---

## 📊 Мониторинг

1. Логировать все созданные invoice
2. Логировать все webhook уведомления
3. Отслеживать успешные и неуспешные платежи
4. Мониторить время обработки webhook

---

## 🚀 Готово к реализации

План готов. Можно приступать к реализации по этапам.
