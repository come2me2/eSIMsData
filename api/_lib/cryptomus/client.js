/**
 * Cryptomus API Client
 * Документация: https://doc.cryptomus.com/
 */

const crypto = require('crypto');

class CryptomusClient {
    constructor() {
        this.merchantId = process.env.CRYPTOMUS_MERCHANT_ID || 'dfa9cae1-60e3-40fc-af59-2a7b9fcac387';
        this.apiKey = process.env.CRYPTOMUS_API_KEY || '7se6oFiNTqa1PMjmQRR4LXvAX5z36ZtV9VJARCl2hbVcF4aa6qCI6nvVO97ZjIMYlJT1DggiWBKuCrvsE5AkrJ2PdWKRGVNC198u4JzxYy7jCuMivgQKnFkhKOdcUT9n';
        this.baseUrl = 'https://api.cryptomus.com/v1';
        
        if (!this.merchantId || !this.apiKey) {
            console.warn('⚠️ CRYPTOMUS_MERCHANT_ID or CRYPTOMUS_API_KEY not set');
        }
    }

    /**
     * Генерирует подпись для запроса
     * Формула: MD5(base64(JSON payload) + API_KEY)
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
     * @param {Object} data - Данные для создания invoice
     * @returns {Promise<Object>} Результат создания invoice
     */
    async createInvoice(data) {
        const payload = {
            amount: String(data.amount),
            currency: data.currency || 'USD',
            order_id: data.order_id,
            url_callback: data.url_callback,
            url_return: data.url_return || data.url_callback,
            to_currency: data.to_currency || process.env.CRYPTOMUS_DEFAULT_CURRENCY || 'USDT',
            network: data.network || process.env.CRYPTOMUS_DEFAULT_NETWORK || 'tron',
            lifetime: data.lifetime || parseInt(process.env.CRYPTOMUS_INVOICE_LIFETIME || '3600')
        };

        const sign = this.generateSign(payload);

        console.log('[Cryptomus] Creating invoice:', {
            order_id: payload.order_id,
            amount: payload.amount,
            currency: payload.currency,
            to_currency: payload.to_currency,
            network: payload.network
        });

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
            console.error('[Cryptomus] API error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            throw new Error(`Cryptomus API error: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        
        if (result.state !== 0) {
            console.error('[Cryptomus] API returned error:', result);
            throw new Error(`Cryptomus API error: ${result.message || 'Unknown error'}`);
        }

        console.log('[Cryptomus] Invoice created successfully:', {
            uuid: result.result?.uuid,
            order_id: result.result?.order_id,
            url: result.result?.url
        });

        return result.result;
    }

    /**
     * Получает информацию о платеже
     * @param {string} uuid - UUID invoice
     * @returns {Promise<Object>} Информация о платеже
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
     * Проверяет подпись webhook
     * @param {Object} data - Данные webhook
     * @param {string} signature - Подпись из webhook
     * @returns {boolean} true если подпись валидна
     */
    verifyWebhookSignature(data, signature) {
        // Удаляем поле sign из данных для проверки
        const { sign, ...dataWithoutSign } = data;
        const payloadBase64 = Buffer.from(JSON.stringify(dataWithoutSign)).toString('base64');
        const expectedSign = crypto
            .createHash('md5')
            .update(payloadBase64 + this.apiKey)
            .digest('hex');
        
        const isValid = expectedSign === signature;
        
        if (!isValid) {
            console.error('[Cryptomus] Invalid webhook signature:', {
                expected: expectedSign,
                received: signature
            });
        }
        
        return isValid;
    }
}

module.exports = new CryptomusClient();
