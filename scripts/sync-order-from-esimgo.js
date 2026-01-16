/**
 * Скрипт для создания заказа в eSIM Go и обновления данных восстановленного заказа
 * Использование: node scripts/sync-order-from-esimgo.js <userId> <tempOrderReference>
 */

// Загружаем переменные окружения
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs').promises;
const path = require('path');
const esimgoClient = require('../api/_lib/esimgo/client');
const ordersHandler = require('../api/orders');

const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');

async function syncOrderFromESimGo(userId, tempOrderReference) {
    try {
        console.log('📖 Загружаю заказы...');
        const allOrders = await fs.readFile(ORDERS_FILE, 'utf8').then(JSON.parse).catch(() => ({}));
        
        if (!allOrders[userId]) {
            throw new Error(`Пользователь ${userId} не найден`);
        }
        
        const order = allOrders[userId].find(o => o.orderReference === tempOrderReference);
        if (!order) {
            throw new Error(`Заказ ${tempOrderReference} не найден`);
        }
        
        if (order.status !== 'payment_received') {
            console.log('⚠️ Заказ уже обработан, статус:', order.status);
            return;
        }
        
        console.log('📦 Найден заказ для синхронизации:', {
            orderReference: order.orderReference,
            bundle_name: order.bundle_name,
            country_code: order.country_code,
            price: order.price
        });
        
        // Создаем заказ через eSIM Go API
        console.log('\n🔄 Создаю заказ в eSIM Go...');
        const orderData = {
            type: 'transaction',
            assign: true,
            order: [{
                type: 'bundle',
                quantity: 1,
                item: order.bundle_name,
                allowReassign: false
            }]
        };
        
        const esimgoOrder = await esimgoClient.createOrder(orderData);
        
        console.log('✅ Заказ создан в eSIM Go:', {
            orderReference: esimgoOrder.orderReference,
            status: esimgoOrder.status,
            total: esimgoOrder.total,
            currency: esimgoOrder.currency
        });
        
        // Получаем assignments (QR код, ICCID и т.д.)
        let assignments = null;
        try {
            console.log('\n📥 Получаю детали установки eSIM...');
            assignments = await esimgoClient.getESIMAssignments(esimgoOrder.orderReference, 'qrCode');
            console.log('✅ Assignments получены:', {
                hasIccid: !!assignments.iccid,
                hasMatchingId: !!assignments.matchingId,
                hasSmdpAddress: !!assignments.smdpAddress,
                hasQrCode: !!(assignments.qrCode || assignments.qr_code)
            });
        } catch (assignError) {
            console.warn('⚠️ Не удалось получить assignments сразу:', assignError.message);
        }
        
        // Обновляем заказ с данными из eSIM Go
        console.log('\n💾 Обновляю заказ с данными из eSIM Go...');
        
        const updatedOrder = {
            ...order,
            orderReference: esimgoOrder.orderReference, // Обновляем на реальный orderReference
            status: esimgoOrder.status === 'completed' ? 'completed' : 'processing',
            iccid: assignments?.iccid || esimgoOrder.order?.[0]?.esims?.[0]?.iccid || null,
            matchingId: assignments?.matchingId || esimgoOrder.order?.[0]?.esims?.[0]?.matchingId || null,
            smdpAddress: assignments?.smdpAddress || esimgoOrder.order?.[0]?.esims?.[0]?.smdpAddress || null,
            rspUrl: assignments?.smdpAddress || esimgoOrder.order?.[0]?.esims?.[0]?.smdpAddress || null,
            qrCode: assignments?.qrCode || assignments?.qr_code || null,
            qr_code: assignments?.qrCode || assignments?.qr_code || null,
            updatedAt: new Date().toISOString()
        };
        
        // Обновляем заказ в массиве
        const orderIndex = allOrders[userId].findIndex(o => o.orderReference === tempOrderReference);
        if (orderIndex !== -1) {
            allOrders[userId][orderIndex] = updatedOrder;
        }
        
        // Сохраняем обновленные заказы
        await fs.writeFile(ORDERS_FILE, JSON.stringify(allOrders, null, 2), 'utf8');
        
        console.log('✅ Заказ успешно обновлен!');
        console.log('\n📊 Детали обновленного заказа:');
        console.log('   Order Reference:', updatedOrder.orderReference);
        console.log('   Status:', updatedOrder.status);
        console.log('   ICCID:', updatedOrder.iccid || 'N/A');
        console.log('   Matching ID:', updatedOrder.matchingId || 'N/A');
        console.log('   SMDP Address:', updatedOrder.smdpAddress || 'N/A');
        console.log('   QR Code:', updatedOrder.qrCode ? '✅ Есть' : '❌ Нет');
        
    } catch (error) {
        console.error('❌ Ошибка при синхронизации заказа:', error);
        process.exit(1);
    }
}

// Запускаем синхронизацию
const userId = process.argv[2] || '8583340074';
const tempOrderReference = process.argv[3] || '431f9e8b-a737-4b5e-bada-cb593ad863af';

syncOrderFromESimGo(userId, tempOrderReference);
