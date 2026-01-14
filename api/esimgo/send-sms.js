/**
 * eSIM Go SMS Sending Module
 * Отправка SMS на eSIM через eSIM Go API
 * 
 * Endpoint: POST /v2.4/esims/{iccid}/sms
 * Документация: https://docs.esim-go.com/api/v2_4/#tag/eSIMs/operation/sendSMS
 */

const { makeRequest } = require('../_lib/esimgo/client');

/**
 * Отправить SMS на eSIM
 * @param {string} iccid - ICCID eSIM
 * @param {string} message - Текст сообщения (1-160 символов, UTF-8)
 * @param {string} from - Отправитель (по умолчанию "eSIM")
 * @returns {Promise<Object>} Результат отправки SMS
 */
async function sendSMSToESIM(iccid, message, from = 'eSIM') {
    if (!iccid) {
        throw new Error('ICCID is required');
    }
    
    if (!message || typeof message !== 'string') {
        throw new Error('Message is required and must be a string');
    }
    
    // Валидация длины сообщения (1-160 символов)
    if (message.length < 1 || message.length > 160) {
        throw new Error(`Message length must be between 1 and 160 characters. Current length: ${message.length}`);
    }
    
    try {
        console.log('📱 Sending SMS to eSIM:', {
            iccid,
            messageLength: message.length,
            from
        });
        
        const response = await makeRequest(`/esims/${iccid}/sms`, {
            method: 'POST',
            body: {
                message: message,
                from: from
            }
        });
        
        console.log('✅ SMS sent successfully:', {
            iccid,
            messageLength: message.length
        });
        
        return {
            success: true,
            iccid,
            message,
            response
        };
        
    } catch (error) {
        console.error('❌ Failed to send SMS to eSIM:', {
            iccid,
            error: error.message,
            stack: error.stack
        });
        
        // Пробрасываем ошибку дальше, но с дополнительной информацией
        throw new Error(`Failed to send SMS to eSIM ${iccid}: ${error.message}`);
    }
}

module.exports = {
    sendSMSToESIM
};
