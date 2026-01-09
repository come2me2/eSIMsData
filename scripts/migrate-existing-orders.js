#!/usr/bin/env node

/**
 * Скрипт для миграции существующих заказов к новой структуре статусов
 * Добавляет недостающие поля для старых заказов
 */

const fs = require('fs').promises;
const path = require('path');

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
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
}

async function migrateOrders() {
    try {
        console.log('\n🔄 Migrating existing orders to new status structure...\n');
        
        const orders = await loadOrders();
        let updatedCount = 0;
        
        for (const userId in orders) {
            if (!Array.isArray(orders[userId])) {
                continue;
            }
            
            for (let i = 0; i < orders[userId].length; i++) {
                const order = orders[userId][i];
                let needsUpdate = false;
                const updates = {};
                
                // Для заказов со статусом completed - устанавливаем payment_confirmed
                if (order.status === 'completed' || order.status === 'active') {
                    if (order.payment_confirmed === undefined) {
                        updates.payment_confirmed = true;
                        needsUpdate = true;
                    }
                    if (order.esim_issued === undefined) {
                        // Если есть eSIM данные, значит eSIM выдана
                        updates.esim_issued = !!(order.iccid || order.matchingId);
                        needsUpdate = true;
                    }
                    if (!order.payment_status) {
                        updates.payment_status = 'succeeded';
                        needsUpdate = true;
                    }
                }
                
                // Для заказов со статусом pending/processing - устанавливаем on_hold
                if (order.status === 'pending' || order.status === 'processing') {
                    updates.status = 'on_hold';
                    needsUpdate = true;
                    if (!order.payment_status) {
                        updates.payment_status = 'pending';
                    }
                    if (order.payment_confirmed === undefined) {
                        updates.payment_confirmed = false;
                    }
                    if (order.esim_issued === undefined) {
                        updates.esim_issued = false;
                    }
                }
                
                // Для заказов со статусом cancelled - устанавливаем canceled
                if (order.status === 'cancelled') {
                    updates.status = 'canceled';
                    needsUpdate = true;
                    if (!order.canceled_reason) {
                        updates.canceled_reason = 'migrated_from_old_status';
                    }
                }
                
                // Добавляем обязательные поля если их нет
                if (!order.source) {
                    updates.source = 'telegram_mini_app';
                    needsUpdate = true;
                }
                if (!order.customer && order.telegram_user_id) {
                    updates.customer = order.telegram_user_id;
                    needsUpdate = true;
                }
                if (!order.provider_product_id && order.bundle_name) {
                    updates.provider_product_id = order.bundle_name;
                    needsUpdate = true;
                }
                
                // Обновляем заказ если нужно
                if (needsUpdate) {
                    orders[userId][i] = {
                        ...order,
                        ...updates,
                        updatedAt: new Date().toISOString()
                    };
                    updatedCount++;
                    console.log(`  ✅ Updated order: ${order.orderReference || order.id || 'unknown'}`);
                }
            }
        }
        
        if (updatedCount > 0) {
            await saveOrders(orders);
            console.log(`\n✅ Migration completed: ${updatedCount} orders updated\n`);
        } else {
            console.log('\n✅ No orders need migration\n');
        }
        
        return { updatedCount };
        
    } catch (error) {
        console.error('❌ Error migrating orders:', error);
        throw error;
    }
}

if (require.main === module) {
    migrateOrders()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { migrateOrders };

