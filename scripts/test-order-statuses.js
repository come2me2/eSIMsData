#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки логики статусов заказов
 * 
 * Использование:
 * node scripts/test-order-statuses.js
 */

const fs = require('fs').promises;
const path = require('path');

const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');

// Цвета для консоли
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

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

async function testOrderStatuses() {
    log('\n🧪 Testing Order Status Logic\n', 'cyan');
    
    const orders = await loadOrders();
    const now = new Date();
    
    let totalOrders = 0;
    let onHoldOrders = 0;
    let completedOrders = 0;
    let failedOrders = 0;
    let canceledOrders = 0;
    let expiredOrders = 0;
    let ordersWithMissingFields = [];
    
    // Проходим по всем пользователям
    for (const userId in orders) {
        if (!Array.isArray(orders[userId])) {
            continue;
        }
        
        for (const order of orders[userId]) {
            totalOrders++;
            
            // Проверяем статус
            switch (order.status) {
                case 'on_hold':
                    onHoldOrders++;
                    break;
                case 'completed':
                    completedOrders++;
                    break;
                case 'failed':
                    failedOrders++;
                    break;
                case 'canceled':
                    canceledOrders++;
                    break;
            }
            
            // Проверяем обязательные поля для новых статусов
            const missingFields = [];
            if (!order.payment_method) missingFields.push('payment_method');
            if (!order.source) missingFields.push('source');
            if (!order.customer) missingFields.push('customer');
            
            // Проверяем поля для статуса on_hold
            if (order.status === 'on_hold') {
                if (!order.expires_at) missingFields.push('expires_at');
                if (order.payment_status === undefined) missingFields.push('payment_status');
            }
            
            // Проверяем поля для статуса failed
            if (order.status === 'failed') {
                if (!order.failed_reason) missingFields.push('failed_reason');
            }
            
            // Проверяем поля для статуса canceled
            if (order.status === 'canceled') {
                if (!order.canceled_reason) missingFields.push('canceled_reason');
            }
            
            // Проверяем таймауты
            if (order.status === 'on_hold' && order.expires_at) {
                const expiresAt = new Date(order.expires_at);
                if (expiresAt < now) {
                    expiredOrders++;
                    log(`  ⚠️  Expired order: ${order.orderReference} (expired at ${order.expires_at})`, 'yellow');
                }
            }
            
            if (missingFields.length > 0) {
                ordersWithMissingFields.push({
                    orderReference: order.orderReference,
                    status: order.status,
                    missingFields: missingFields
                });
            }
        }
    }
    
    // Выводим статистику
    log('\n📊 Statistics:', 'cyan');
    log(`  Total orders: ${totalOrders}`, 'blue');
    log(`  On Hold: ${onHoldOrders}`, 'yellow');
    log(`  Completed: ${completedOrders}`, 'green');
    log(`  Failed: ${failedOrders}`, 'red');
    log(`  Canceled: ${canceledOrders}`, 'blue');
    log(`  Expired (on_hold): ${expiredOrders}`, 'yellow');
    
    // Проверяем заказы с отсутствующими полями
    if (ordersWithMissingFields.length > 0) {
        log('\n❌ Orders with missing fields:', 'red');
        ordersWithMissingFields.forEach(({ orderReference, status, missingFields }) => {
            log(`  - ${orderReference} (${status}): missing ${missingFields.join(', ')}`, 'red');
        });
    } else {
        log('\n✅ All orders have required fields', 'green');
    }
    
    // Проверяем логику статусов
    log('\n🔍 Status Logic Validation:', 'cyan');
    
    let validationErrors = [];
    
    for (const userId in orders) {
        if (!Array.isArray(orders[userId])) continue;
        
        for (const order of orders[userId]) {
            // Проверка: completed должен иметь eSIM данные
            if (order.status === 'completed') {
                if (!order.iccid && !order.matchingId) {
                    validationErrors.push({
                        orderReference: order.orderReference,
                        issue: 'completed status without eSIM data'
                    });
                }
                if (order.payment_confirmed !== true) {
                    validationErrors.push({
                        orderReference: order.orderReference,
                        issue: 'completed status without payment_confirmed=true'
                    });
                }
            }
            
            // Проверка: on_hold должен иметь expires_at
            if (order.status === 'on_hold') {
                if (!order.expires_at) {
                    validationErrors.push({
                        orderReference: order.orderReference,
                        issue: 'on_hold status without expires_at'
                    });
                }
            }
            
            // Проверка: failed должен иметь failed_reason
            if (order.status === 'failed') {
                if (!order.failed_reason) {
                    validationErrors.push({
                        orderReference: order.orderReference,
                        issue: 'failed status without failed_reason'
                    });
                }
            }
            
            // Проверка: canceled должен иметь canceled_reason
            if (order.status === 'canceled') {
                if (!order.canceled_reason) {
                    validationErrors.push({
                        orderReference: order.orderReference,
                        issue: 'canceled status without canceled_reason'
                    });
                }
            }
        }
    }
    
    if (validationErrors.length > 0) {
        log('\n❌ Validation errors found:', 'red');
        validationErrors.forEach(({ orderReference, issue }) => {
            log(`  - ${orderReference}: ${issue}`, 'red');
        });
    } else {
        log('\n✅ All status logic validations passed', 'green');
    }
    
    // Проверяем таймауты
    log('\n⏰ Timeout Validation:', 'cyan');
    const { checkTimeouts } = require('./check-order-timeouts');
    try {
        const result = await checkTimeouts();
        log(`  Checked: ${result.totalChecked} orders`, 'blue');
        log(`  Canceled: ${result.totalCanceled} orders`, result.totalCanceled > 0 ? 'yellow' : 'blue');
    } catch (error) {
        log(`  ❌ Error checking timeouts: ${error.message}`, 'red');
    }
    
    log('\n✅ Testing completed\n', 'cyan');
    
    return {
        totalOrders,
        onHoldOrders,
        completedOrders,
        failedOrders,
        canceledOrders,
        expiredOrders,
        ordersWithMissingFields: ordersWithMissingFields.length,
        validationErrors: validationErrors.length
    };
}

// Запускаем тесты
if (require.main === module) {
    testOrderStatuses()
        .then((result) => {
            if (result.validationErrors > 0 || result.ordersWithMissingFields > 0) {
                process.exit(1);
            } else {
                process.exit(0);
            }
        })
        .catch((error) => {
            log(`\n❌ Fatal error: ${error.message}`, 'red');
            console.error(error);
            process.exit(1);
        });
}

module.exports = { testOrderStatuses };

