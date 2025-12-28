/**
 * Скрипт для добавления мокап-заказа в админку
 * Использование: node scripts/add-mock-order.js
 */

const fs = require('fs').promises;
const path = require('path');

const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');

// Мокап-заказ с полными данными
function createMockOrder() {
    const createdAt = new Date().toISOString();
    const createdAtDate = new Date(createdAt);
    const date = createdAtDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const time = createdAtDate.toTimeString().split(' ')[0]; // HH:MM:SS
    
    return {
        // Базовые поля
        orderReference: 'MOCK-ORDER-001',
        number: 'MOCK-ORDER-001', // Дублируем для удобства
        
        // Обязательные поля согласно требованиям
        source: 'telegram_mini_app',
        customer: '123456789', // telegram_user_id
        provider_product_id: 'esim_1GB_7D_US_V2', // bundle_name
        provider_base_price_usd: 10.99, // Базовая цена провайдера (до наценок)
        payment_method: 'telegram_stars',
        date: date,
        time: time,
        status: 'completed',
        
        // eSIM данные
        iccid: '8944123456789012345',
        matchingId: 'A1B2-C3D4-E5F6-G7H8',
        smdpAddress: 'http://rsp.truphone.com',
        rspUrl: 'http://rsp.truphone.com',
        
        // Географические данные
        country_code: 'US',
        country_name: 'United States',
        
        // План данных
        plan_id: 'esim_1GB_7D_US_V2',
        plan_type: 'standard',
        plan_name: '1GB 7 Days',
        bundle_name: 'esim_1GB_7D_US_V2',
        
        // Цены
        price: '12.99',
        currency: 'USD',
        
        // Временные метки
        createdAt: createdAt,
        updatedAt: new Date().toISOString(),
        
        // Для обратной совместимости
        telegram_user_id: '123456789',
        telegram_username: 'test_user',
        paymentType: 'telegram_stars',
        
        // QR код (можно использовать реальный URL или base64)
        qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=LPA:1$rsp.truphone.com$A1B2-C3D4-E5F6-G7H8',
        qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=LPA:1$rsp.truphone.com$A1B2-C3D4-E5F6-G7H8'
    };
}

const mockOrder = createMockOrder();

async function addMockOrder() {
    try {
        // Создаем директорию data если её нет
        const dataDir = path.dirname(ORDERS_FILE);
        await fs.mkdir(dataDir, { recursive: true });
        
        // Загружаем существующие заказы
        let orders = {};
        try {
            const data = await fs.readFile(ORDERS_FILE, 'utf8');
            orders = JSON.parse(data);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
            // Файл не существует, создаем новый
            orders = {};
        }
        
        // Используем тестовый telegram_user_id
        const testUserId = '123456789'; // Тестовый Telegram ID
        
        // Проверяем, не существует ли уже такой заказ
        if (!orders[testUserId]) {
            orders[testUserId] = [];
        }
        
        const existingIndex = orders[testUserId].findIndex(
            o => o.orderReference === mockOrder.orderReference
        );
        
        // Обновляем моковый заказ с новыми обязательными полями
        const updatedMockOrder = {
            ...mockOrder,
            customer: testUserId,
            telegram_user_id: testUserId
        };
        
        if (existingIndex >= 0) {
            // Обновляем существующий заказ, добавляя новые поля
            const existingOrder = orders[testUserId][existingIndex];
            const createdAtDate = existingOrder.createdAt ? new Date(existingOrder.createdAt) : new Date();
            const date = createdAtDate.toISOString().split('T')[0];
            const time = createdAtDate.toTimeString().split(' ')[0];
            
            orders[testUserId][existingIndex] = {
                ...existingOrder,
                // Добавляем новые обязательные поля если их нет
                number: existingOrder.number || existingOrder.orderReference,
                source: existingOrder.source || 'telegram_mini_app',
                customer: existingOrder.customer || testUserId,
                telegram_user_id: existingOrder.telegram_user_id || testUserId,
                provider_product_id: existingOrder.provider_product_id || existingOrder.bundle_name || null,
                provider_base_price_usd: existingOrder.provider_base_price_usd || (existingOrder.price ? parseFloat(existingOrder.price) * 0.85 : null),
                payment_method: existingOrder.payment_method || null,
                date: existingOrder.date || date,
                time: existingOrder.time || time,
                status: existingOrder.status || 'completed',
                updatedAt: new Date().toISOString()
            };
            console.log('✅ Мокап-заказ обновлен с новыми полями');
        } else {
            // Добавляем новый заказ
            orders[testUserId].push(updatedMockOrder);
            console.log('✅ Мокап-заказ добавлен');
        }
        
        // Сохраняем обратно в файл
        await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
        
        const orderToShow = existingIndex >= 0 ? orders[testUserId][existingIndex] : updatedMockOrder;
        console.log('\n📦 Мокап-заказ:');
        console.log('   ID:', orderToShow.orderReference);
        console.log('   Номер:', orderToShow.number);
        console.log('   Источник:', orderToShow.source);
        console.log('   Пользователь:', orderToShow.customer, `(@${orderToShow.telegram_username})`);
        console.log('   Страна:', orderToShow.country_name);
        console.log('   План:', orderToShow.plan_name);
        console.log('   Provider Product ID:', orderToShow.provider_product_id);
        console.log('   Базовая цена провайдера: $' + orderToShow.provider_base_price_usd);
        console.log('   Финальная цена: $' + orderToShow.price);
        console.log('   Способ оплаты:', orderToShow.payment_method);
        console.log('   Дата:', orderToShow.date);
        console.log('   Время:', orderToShow.time);
        console.log('   Статус:', orderToShow.status);
        console.log('   ICCID:', orderToShow.iccid);
        console.log('   Matching ID:', orderToShow.matchingId);
        console.log('   RSP URL:', orderToShow.rspUrl);
        console.log('\n💡 Теперь вы можете увидеть этот заказ в админ-панели!');
        
    } catch (error) {
        console.error('❌ Ошибка при добавлении мокап-заказа:', error);
        process.exit(1);
    }
}

// Запускаем скрипт
addMockOrder();





