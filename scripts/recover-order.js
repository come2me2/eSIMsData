/**
 * Скрипт для восстановления заказа из данных платежа
 * Использование: node scripts/recover-order.js <userId> <bundle_name> <price> <orderReference>
 * 
 * Пример:
 *   node scripts/recover-order.js 8583340074 esim_1GB_7D_TH_V2 2.70 <orderRef>
 */

const esimgoOrder = require('../api/esimgo/order');
const ordersHandler = require('../api/orders');
const path = require('path');

// Данные из логов платежа от 12:28:26
const paymentData = {
    userId: process.argv[2] || '8583340074',
    bundle_name: process.argv[3] || 'esim_1GB_7D_TH_V2',
    price: parseFloat(process.argv[4]) || 2.70,
    plan_id: process.argv[3] || 'esim_1GB_7D_TH_V2',
    plan_type: 'standard',
    country_code: 'TH',
    country_name: 'Thailand',
    payment_method: 'telegram_stars',
    amountStars: 277,
    finalPrice: parseFloat(process.argv[4]) || 2.70
};

async function recoverOrder() {
    try {
        console.log('🔄 Восстанавливаю заказ из данных платежа...');
        console.log('Данные платежа:', paymentData);
        
        // Создаем заказ через eSIM Go API
        console.log('\n📦 Создаю заказ через eSIM Go API...');
        const orderResult = await esimgoOrder.handler({
            method: 'POST',
            body: {
                plan_id: paymentData.plan_id,
                plan_type: paymentData.plan_type,
                bundle_name: paymentData.bundle_name,
                country_code: paymentData.country_code,
                country_name: paymentData.country_name,
                telegram_user_id: paymentData.userId
            }
        }, {
            status: (code) => ({
                json: (data) => {
                    if (code >= 400) {
                        throw new Error(JSON.stringify(data));
                    }
                    return data;
                }
            })
        });
        
        if (!orderResult || !orderResult.success) {
            throw new Error('Failed to create order via eSIM Go API');
        }
        
        const orderReference = orderResult.data.orderReference;
        console.log('✅ Заказ создан в eSIM Go:', orderReference);
        
        // Сохраняем заказ в локальную базу
        console.log('\n💾 Сохраняю заказ в локальную базу...');
        const savedOrder = await ordersHandler.saveOrder({
            orderReference: orderReference,
            telegram_user_id: paymentData.userId,
            plan_id: paymentData.plan_id,
            plan_type: paymentData.plan_type,
            bundle_name: paymentData.bundle_name,
            country_code: paymentData.country_code,
            country_name: paymentData.country_name,
            price: paymentData.price,
            finalPrice: paymentData.finalPrice,
            currency: 'USD',
            status: 'completed',
            payment_method: paymentData.payment_method,
            source: 'telegram_mini_app',
            customer: paymentData.userId
        });
        
        console.log('✅ Заказ восстановлен и сохранен!');
        console.log('\n📊 Детали заказа:');
        console.log('   Order Reference:', savedOrder.orderReference);
        console.log('   Bundle:', savedOrder.bundle_name);
        console.log('   Price:', savedOrder.price);
        console.log('   Final Price:', savedOrder.finalPrice);
        console.log('   Status:', savedOrder.status);
        console.log('   User ID:', paymentData.userId);
        
    } catch (error) {
        console.error('❌ Ошибка при восстановлении заказа:', error);
        process.exit(1);
    }
}

recoverOrder();
