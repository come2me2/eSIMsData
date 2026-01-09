#!/usr/bin/env node

/**
 * Скрипт для проверки таймаутов заказов со статусом on_hold
 * Устанавливает статус canceled для заказов с истекшим expires_at
 * 
 * Использование:
 * node scripts/check-order-timeouts.js
 * 
 * Можно запускать через cron каждую минуту:
 * * * * * * cd /var/www/esimsdata && node scripts/check-order-timeouts.js
 */

const fs = require('fs').promises;
const path = require('path');

const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');

// Таймауты для разных платежных методов (в миллисекундах)
const TIMEOUTS = {
    telegram_stars: 5 * 60 * 1000,      // 5 минут
    stripe: 20 * 60 * 1000,              // 20 минут
    cryptomus: 60 * 60 * 1000           // 60 минут
};

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

async function checkTimeouts() {
    try {
        console.log(`\n⏰ Checking order timeouts at ${new Date().toISOString()}`);
        
        const orders = await loadOrders();
        const now = new Date();
        let totalChecked = 0;
        let totalCanceled = 0;
        
        // Проходим по всем пользователям
        for (const userId in orders) {
            if (!Array.isArray(orders[userId])) {
                continue;
            }
            
            // Проверяем заказы со статусом on_hold
            for (let i = 0; i < orders[userId].length; i++) {
                const order = orders[userId][i];
                
                if (order.status !== 'on_hold') {
                    continue;
                }
                
                totalChecked++;
                
                // Проверяем expires_at
                if (order.expires_at) {
                    const expiresAt = new Date(order.expires_at);
                    
                    if (expiresAt < now) {
                        // Таймаут истек - устанавливаем статус canceled
                        orders[userId][i] = {
                            ...order,
                            status: 'canceled',
                            canceled_reason: 'timeout',
                            updatedAt: new Date().toISOString()
                        };
                        
                        totalCanceled++;
                        
                        console.log(`  ❌ Order canceled (timeout):`, {
                            userId: userId,
                            orderReference: order.orderReference,
                            payment_method: order.payment_method,
                            expires_at: order.expires_at,
                            canceled_at: new Date().toISOString()
                        });
                    }
                } else {
                    // Если expires_at нет, но заказ on_hold, устанавливаем таймаут на основе payment_method
                    const paymentMethod = order.payment_method || 'telegram_stars';
                    const timeout = TIMEOUTS[paymentMethod] || TIMEOUTS.telegram_stars;
                    const createdAt = new Date(order.createdAt || order.date || Date.now());
                    const expiresAt = new Date(createdAt.getTime() + timeout);
                    
                    if (expiresAt < now) {
                        // Таймаут истек
                        orders[userId][i] = {
                            ...order,
                            status: 'canceled',
                            canceled_reason: 'timeout',
                            expires_at: expiresAt.toISOString(),
                            updatedAt: new Date().toISOString()
                        };
                        
                        totalCanceled++;
                        
                        console.log(`  ❌ Order canceled (timeout, no expires_at):`, {
                            userId: userId,
                            orderReference: order.orderReference,
                            payment_method: paymentMethod,
                            created_at: createdAt.toISOString(),
                            calculated_expires_at: expiresAt.toISOString()
                        });
                    } else {
                        // Устанавливаем expires_at для будущих проверок
                        orders[userId][i] = {
                            ...order,
                            expires_at: expiresAt.toISOString(),
                            updatedAt: new Date().toISOString()
                        };
                        
                        console.log(`  ⏳ Order still valid:`, {
                            userId: userId,
                            orderReference: order.orderReference,
                            expires_at: expiresAt.toISOString(),
                            time_remaining: Math.round((expiresAt - now) / 1000 / 60) + ' minutes'
                        });
                    }
                }
            }
        }
        
        if (totalCanceled > 0) {
            await saveOrders(orders);
            console.log(`\n✅ Timeout check completed: ${totalCanceled} orders canceled out of ${totalChecked} checked`);
        } else {
            console.log(`\n✅ Timeout check completed: ${totalChecked} orders checked, none expired`);
        }
        
        return { totalChecked, totalCanceled };
        
    } catch (error) {
        console.error('❌ Error checking order timeouts:', error);
        throw error;
    }
}

// Запускаем скрипт
if (require.main === module) {
    checkTimeouts()
        .then((result) => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { checkTimeouts };

