/**
 * Тестовый скрипт для проверки отправки сообщений в Telegram
 * 
 * Использование:
 * node scripts/test-send-message.js <telegramUserId> [message]
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

async function sendTestMessage(chatId, message = null) {
    if (!BOT_TOKEN) {
        console.error('❌ TELEGRAM_BOT_TOKEN not set');
        process.exit(1);
    }
    
    const testMessage = message || `📱 <b>Test eSIM data:</b>\n\nICCID: <code>8944123456789012345</code>\nMatching ID: <code>A1B2-C3D4-E5F6-G7H8</code>\nRSP URL: <code>https://smdp.example.com</code>`;
    
    try {
        console.log('📤 Sending test message to:', chatId);
        console.log('Message:', testMessage);
        
        // Отправляем текстовое сообщение
        const textResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: testMessage,
                parse_mode: 'HTML'
            })
        });
        
        const textData = await textResponse.json();
        
        console.log('📤 sendMessage response:', {
            ok: textData.ok,
            error: textData.error,
            description: textData.description,
            message_id: textData.result?.message_id
        });
        
        if (!textData.ok) {
            console.error('❌ Failed to send message:', textData);
            process.exit(1);
        }
        
        console.log('✅ Message sent successfully');
        
        // Тест отправки QR кода (пример URL)
        const qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=LPA%3A1%24https%3A%2F%2Fsmdp.example.com%24A1B2-C3D4-E5F6-G7H8';
        
        console.log('\n📤 Sending QR code photo...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const photoResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                photo: qrCodeUrl,
                caption: 'QR code for eSIM activation (test)'
            })
        });
        
        const photoData = await photoResponse.json();
        
        console.log('📤 sendPhoto response:', {
            ok: photoData.ok,
            error: photoData.error,
            description: photoData.description,
            message_id: photoData.result?.message_id
        });
        
        if (photoData.ok) {
            console.log('✅ QR code photo sent successfully');
        } else {
            console.warn('⚠️ Failed to send QR code photo:', photoData);
        }
        
    } catch (error) {
        console.error('❌ Error sending message:', error);
        process.exit(1);
    }
}

// Получаем аргументы командной строки
const telegramUserId = process.argv[2];
const customMessage = process.argv[3] || null;

if (!telegramUserId) {
    console.error('❌ Укажите Telegram User ID:');
    console.log('   node scripts/test-send-message.js <telegramUserId> [message]');
    process.exit(1);
}

sendTestMessage(telegramUserId, customMessage);
