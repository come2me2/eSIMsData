/**
 * Скрипт для проверки Bundle Usage для конкретного заказа
 * 
 * Использование:
 * node scripts/check-bundle-usage.js <orderReference> <telegramUserId>
 * 
 * Пример:
 * node scripts/check-bundle-usage.js aa73ec03-4bf2-4753-b6a3-17e0aca54eea 8583340074
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs').promises;
const path = require('path');
const esimgoClient = require('../api/_lib/esimgo/client');

const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');

/**
 * Загрузить все заказы
 */
async function loadOrders() {
    try {
        const data = await fs.readFile(ORDERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {};
        }
        throw error;
    }
}

/**
 * Проверить Bundle Usage для заказа
 */
async function checkBundleUsage(orderReference, telegramUserId) {
    try {
        console.log(`\n🔍 Проверка Bundle Usage для заказа ${orderReference} (пользователь: ${telegramUserId})\n`);
        
        // 1. Проверяем заказ в базе данных
        console.log('1️⃣ Проверка заказа в базе данных...');
        const allOrders = await loadOrders();
        const userOrders = allOrders[telegramUserId] || [];
        const order = userOrders.find(o => o.orderReference === orderReference);
        
        if (!order) {
            console.error('❌ Заказ не найден в базе данных');
            console.log('   Попробуйте восстановить заказ:');
            console.log(`   node scripts/restore-order-and-send-qr.js ${orderReference} ${telegramUserId}`);
            return;
        }
        
        console.log('✅ Заказ найден в базе данных');
        console.log('   Статус:', order.status);
        console.log('   ICCID:', order.iccid || 'не указан');
        console.log('   Matching ID:', order.matchingId || 'не указан');
        
        // 2. Проверяем данные usage из заказа (из callback'а)
        if (order.usage) {
            console.log('\n2️⃣ Данные usage из заказа (из callback):');
            console.log('   Bundle:', order.usage.bundle || 'не указан');
            console.log('   Initial Quantity:', order.usage.initialQuantity ? `${(order.usage.initialQuantity / (1024 * 1024)).toFixed(2)} MB` : 'не указано');
            console.log('   Remaining Quantity:', order.usage.remainingQuantity ? `${(order.usage.remainingQuantity / (1024 * 1024)).toFixed(2)} MB` : 'не указано');
            console.log('   Used Quantity:', order.usage.usedQuantity ? `${(order.usage.usedQuantity / (1024 * 1024)).toFixed(2)} MB` : 'не указано');
            console.log('   Start Time:', order.usage.startTime || 'не указано');
            console.log('   End Time:', order.usage.endTime || 'не указано');
            console.log('   Last Updated:', order.usage.lastUpdated || 'не указано');
        } else {
            console.log('\n2️⃣ Данные usage из заказа: ❌ отсутствуют');
            console.log('   Это означает, что callback от eSIM Go еще не получен или не обработан');
        }
        
        // 3. Проверяем ICCID
        if (!order.iccid) {
            console.error('\n❌ ICCID не найден в заказе');
            console.log('   Невозможно проверить Bundle Usage без ICCID');
            console.log('   Попробуйте восстановить заказ:');
            console.log(`   node scripts/restore-order-and-send-qr.js ${orderReference} ${telegramUserId}`);
            return;
        }
        
        // 4. Получаем данные из eSIM Go API
        console.log(`\n3️⃣ Получение данных из eSIM Go API для ICCID: ${order.iccid}...`);
        try {
            const bundlesResponse = await esimgoClient.getESIMBundles(order.iccid);
            
            if (!bundlesResponse || !bundlesResponse.bundles || bundlesResponse.bundles.length === 0) {
                console.warn('⚠️ Bundles не найдены для этого eSIM');
                return;
            }
            
            console.log('✅ Bundles найдены:', bundlesResponse.bundles.length);
            
            // Находим активный bundle
            const activeBundle = bundlesResponse.bundles.find(bundle => {
                if (!bundle.assignments || bundle.assignments.length === 0) {
                    return false;
                }
                const activeAssignment = bundle.assignments.find(assignment => 
                    assignment.bundleState === 'Active' || 
                    assignment.bundleState === 'Queued' ||
                    assignment.bundleState === 'Processing'
                );
                return !!activeAssignment;
            });
            
            if (!activeBundle || !activeBundle.assignments || activeBundle.assignments.length === 0) {
                console.warn('⚠️ Активный bundle не найден');
                return;
            }
            
            // Находим активное assignment
            const activeAssignment = activeBundle.assignments
                .filter(assignment => 
                    assignment.bundleState === 'Active' || 
                    assignment.bundleState === 'Queued' ||
                    assignment.bundleState === 'Processing'
                )
                .sort((a, b) => {
                    const priority = { 'Active': 1, 'Queued': 2, 'Processing': 3 };
                    return (priority[a.bundleState] || 99) - (priority[b.bundleState] || 99);
                })[0];
            
            if (!activeAssignment) {
                console.warn('⚠️ Активное assignment не найдено');
                return;
            }
            
            // Конвертируем байты в MB
            const initialQuantityBytes = activeAssignment.initialQuantity || 0;
            const remainingQuantityBytes = activeAssignment.remainingQuantity || 0;
            const usedQuantityBytes = initialQuantityBytes - remainingQuantityBytes;
            
            const initialQuantityMB = initialQuantityBytes / (1024 * 1024);
            const remainingQuantityMB = remainingQuantityBytes / (1024 * 1024);
            const usedQuantityMB = usedQuantityBytes / (1024 * 1024);
            
            console.log('\n4️⃣ Данные Bundle Usage из eSIM Go API:');
            console.log('   Bundle Name:', activeBundle.name || 'не указан');
            console.log('   Bundle Description:', activeBundle.description || 'не указано');
            console.log('   Bundle State:', activeAssignment.bundleState || 'не указано');
            console.log('   Total Data:', `${initialQuantityMB.toFixed(2)} MB`);
            console.log('   Used Data:', `${usedQuantityMB.toFixed(2)} MB`);
            console.log('   Remaining Data:', `${remainingQuantityMB.toFixed(2)} MB`);
            console.log('   Usage Percent:', `${((usedQuantityMB / initialQuantityMB) * 100).toFixed(2)}%`);
            
            if (activeAssignment.assignmentDateTime) {
                console.log('   Assignment Date:', new Date(activeAssignment.assignmentDateTime).toLocaleString());
            }
            
            if (activeAssignment.unlimited) {
                console.log('   Unlimited:', 'Да');
            }
            
            // 5. Сравниваем данные
            console.log('\n5️⃣ Сравнение данных:');
            if (order.usage) {
                const orderUsedMB = (order.usage.usedQuantity || 0) / (1024 * 1024);
                const apiUsedMB = usedQuantityMB;
                const diff = Math.abs(orderUsedMB - apiUsedMB);
                
                if (diff < 0.01) {
                    console.log('   ✅ Данные совпадают (разница < 0.01 MB)');
                } else {
                    console.log(`   ⚠️ Данные различаются (разница: ${diff.toFixed(2)} MB)`);
                    console.log(`      Заказ: ${orderUsedMB.toFixed(2)} MB`);
                    console.log(`      API: ${apiUsedMB.toFixed(2)} MB`);
                }
            } else {
                console.log('   ⚠️ Данные usage в заказе отсутствуют');
                console.log('   Рекомендуется настроить callback URL в eSIM Portal');
            }
            
        } catch (apiError) {
            console.error('❌ Ошибка при получении данных из eSIM Go API:', apiError.message);
            console.error('   Stack:', apiError.stack);
        }
        
        // 6. Проверяем endpoint /api/esimgo/bundles
        console.log(`\n6️⃣ Проверка endpoint /api/esimgo/bundles?iccid=${order.iccid}...`);
        console.log('   (Этот endpoint используется на странице Current eSIM)');
        console.log('   Для проверки откройте в браузере:');
        console.log(`   http://localhost:3000/api/esimgo/bundles?iccid=${order.iccid}`);
        
        console.log('\n✅ Проверка завершена\n');
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        process.exit(1);
    }
}

// Получаем аргументы командной строки
const orderReference = process.argv[2];
const telegramUserId = process.argv[3];

if (!orderReference || !telegramUserId) {
    console.error('❌ Укажите orderReference и telegramUserId:');
    console.log('   node scripts/check-bundle-usage.js <orderReference> <telegramUserId>');
    console.log('   Пример:');
    console.log('   node scripts/check-bundle-usage.js aa73ec03-4bf2-4753-b6a3-17e0aca54eea 8583340074');
    process.exit(1);
}

checkBundleUsage(orderReference, telegramUserId);
