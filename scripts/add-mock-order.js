/**
 * Скрипт для добавления мокап-заказа в админку
 * Использование: node scripts/add-mock-order.js
 */

const fs = require('fs').promises;
const path = require('path');

const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');

// Мокап-заказ с полными данными
const mockOrder = {
    orderReference: 'MOCK-ORDER-001',
    iccid: '8944123456789012345',
    matchingId: 'A1B2-C3D4-E5F6-G7H8',
    smdpAddress: 'http://rsp.truphone.com',
    rspUrl: 'http://rsp.truphone.com',
    country_code: 'US',
    country_name: 'United States',
    plan_id: 'esim_1GB_7D_US_V2',
    plan_type: 'standard',
    plan_name: '1GB 7 Days',
    bundle_name: 'esim_1GB_7D_US_V2',
    price: '12.99',
    currency: 'USD',
    payment_method: 'telegram_stars',
    paymentType: 'telegram_stars',
    status: 'completed',
    telegram_username: 'test_user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // QR код (можно использовать реальный URL или base64)
    qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=LPA:1$rsp.truphone.com$A1B2-C3D4-E5F6-G7H8',
    qr_code: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=LPA:1$rsp.truphone.com$A1B2-C3D4-E5F6-G7H8'
};

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
        
        if (existingIndex >= 0) {
            // Обновляем существующий заказ
            orders[testUserId][existingIndex] = {
                ...orders[testUserId][existingIndex],
                ...mockOrder
            };
            console.log('✅ Мокап-заказ обновлен');
        } else {
            // Добавляем новый заказ
            orders[testUserId].push(mockOrder);
            console.log('✅ Мокап-заказ добавлен');
        }
        
        // Сохраняем обратно в файл
        await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
        
        console.log('\n📦 Мокап-заказ:');
        console.log('   ID:', mockOrder.orderReference);
        console.log('   Пользователь:', testUserId, `(@${mockOrder.telegram_username})`);
        console.log('   Страна:', mockOrder.country_name);
        console.log('   План:', mockOrder.plan_name);
        console.log('   Цена: $' + mockOrder.price);
        console.log('   Статус:', mockOrder.status);
        console.log('   ICCID:', mockOrder.iccid);
        console.log('   Matching ID:', mockOrder.matchingId);
        console.log('   RSP URL:', mockOrder.rspUrl);
        console.log('\n💡 Теперь вы можете увидеть этот заказ в админ-панели!');
        
    } catch (error) {
        console.error('❌ Ошибка при добавлении мокап-заказа:', error);
        process.exit(1);
    }
}

// Запускаем скрипт
addMockOrder();




