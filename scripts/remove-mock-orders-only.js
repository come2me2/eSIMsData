#!/usr/bin/env node

/**
 * Скрипт для удаления только mock-заказов с форматом ESIM-2025-12-XXX
 * Оставляет все реальные заказы
 * 
 * Использование:
 * node scripts/remove-mock-orders-only.js
 */

const path = require('path');
const fs = require('fs').promises;

const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');

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

async function saveOrders(orders) {
    const dataDir = path.dirname(ORDERS_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
}

function isMockOrder(order) {
    // Проверяем, является ли заказ mock-заказом
    const orderRef = order.orderReference || order.number || order.id || '';
    // Mock-заказы имеют формат ESIM-2025-12-XXX
    return /^ESIM-2025-12-\d+$/.test(orderRef);
}

async function removeMockOrders() {
    try {
        console.log('📖 Загружаю заказы...');
        const orders = await loadOrders();
        
        let totalRemoved = 0;
        let totalKept = 0;
        
        // Проходим по всем пользователям
        for (const userId in orders) {
            if (!Array.isArray(orders[userId])) {
                continue;
            }
            
            const originalCount = orders[userId].length;
            
            // Фильтруем заказы, оставляя только реальные
            orders[userId] = orders[userId].filter(order => {
                if (isMockOrder(order)) {
                    totalRemoved++;
                    console.log(`  ❌ Удаляю mock-заказ: ${order.orderReference || order.number || order.id}`);
                    return false;
                } else {
                    totalKept++;
                    console.log(`  ✅ Оставляю реальный заказ: ${order.orderReference || order.number || order.id}`);
                    return true;
                }
            });
            
            const removedCount = originalCount - orders[userId].length;
            if (removedCount > 0) {
                console.log(`  📊 Пользователь ${userId}: удалено ${removedCount} mock-заказов, оставлено ${orders[userId].length} реальных`);
            }
        }
        
        console.log('\n💾 Сохраняю обновленные заказы...');
        await saveOrders(orders);
        
        console.log('\n✅ Готово!');
        console.log(`   Удалено mock-заказов: ${totalRemoved}`);
        console.log(`   Оставлено реальных заказов: ${totalKept}`);
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        process.exit(1);
    }
}

// Запускаем скрипт
removeMockOrders();

