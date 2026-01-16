/**
 * Скрипт для обновления finalPrice в старых заказах
 * Пересчитывает финальную цену на основе себестоимости и наценок
 * 
 * Использование:
 *   node scripts/update-orders-finalprice.js
 */

const fs = require('fs').promises;
const path = require('path');

const ORDERS_FILE = path.join(__dirname, '..', 'data', 'orders.json');

// Базовые наценки (по умолчанию)
const DEFAULT_BASE_MARKUP = 1.29; // +29%
const DEFAULT_STARS_MARKUP = 1.05; // +5% для Telegram Stars
const STARS_TELEGRAM_FEE = 0.25; // 25% комиссия Telegram
const STARS_RATE = 0.013; // $0.013 за 1 Star

/**
 * Загружает настройки наценок из админки
 */
async function loadMarkupSettings() {
    try {
        const settingsFile = path.join(__dirname, '..', 'data', 'settings.json');
        const data = await fs.readFile(settingsFile, 'utf8');
        const settings = JSON.parse(data);
        return settings;
    } catch (error) {
        console.warn('⚠️ Failed to load settings, using defaults:', error.message);
        return { markup: {}, paymentMethods: {} };
    }
}

/**
 * Пересчитывает финальную цену на основе себестоимости и наценок
 */
function calculateFinalPrice(costPrice, baseMarkup = DEFAULT_BASE_MARKUP, starsMarkup = DEFAULT_STARS_MARKUP) {
    if (!costPrice || costPrice <= 0) {
        return null;
    }
    
    // Финальная цена = себестоимость × базовая маржа × маржа Stars
    const finalPrice = costPrice * baseMarkup * starsMarkup;
    return parseFloat(finalPrice.toFixed(2));
}

/**
 * Обновляет заказы, добавляя finalPrice
 */
async function updateOrdersFinalPrice() {
    try {
        console.log('📖 Загружаю заказы из файла...');
        const data = await fs.readFile(ORDERS_FILE, 'utf8');
        const allOrders = JSON.parse(data);
        
        // Загружаем настройки наценок
        const settings = await loadMarkupSettings();
        const markup = settings.markup || {};
        const paymentMethods = settings.paymentMethods || {};
        const baseMarkup = markup.enabled ? (markup.base || markup.defaultMultiplier || DEFAULT_BASE_MARKUP) : DEFAULT_BASE_MARKUP;
        const starsMethod = paymentMethods.telegramStars || {};
        const starsMarkup = starsMethod.enabled ? (starsMethod.markupMultiplier || starsMethod.markup || DEFAULT_STARS_MARKUP) : DEFAULT_STARS_MARKUP;
        
        console.log('📊 Настройки наценок:', {
            baseMarkup: baseMarkup,
            starsMarkup: starsMarkup,
            formula: `finalPrice = costPrice × ${baseMarkup} × ${starsMarkup}`
        });
        
        let updatedCount = 0;
        let skippedCount = 0;
        
        console.log('\n🔍 Проверяю заказы...\n');
        
        // Проходим по всем пользователям
        for (const userId in allOrders) {
            const userOrders = allOrders[userId];
            
            if (!Array.isArray(userOrders)) {
                continue;
            }
            
            // Проходим по всем заказам пользователя
            for (const order of userOrders) {
                // ✅ ИСПРАВЛЕНИЕ: Пересчитываем finalPrice, если он равен price и price выглядит как себестоимость
                // Это означает, что finalPrice был установлен неправильно
                // Для старых заказов payment_method может быть null, но они все через Telegram Stars
                const isTelegramStarsOrder = !order.payment_method || order.payment_method === 'telegram_stars';
                const needsRecalculation = !order.finalPrice || 
                    (order.finalPrice === order.price && order.price < 2.5 && isTelegramStarsOrder);
                
                if (order.finalPrice && order.finalPrice > 0 && !needsRecalculation) {
                    skippedCount++;
                    continue;
                }
                
                // Если есть price, но нет finalPrice или finalPrice равен price (не был пересчитан)
                if (order.price && order.price > 0) {
                    // ✅ УЛУЧШЕННАЯ ЛОГИКА: Определяем, является ли price себестоимостью
                    // Для заказов через Telegram Stars:
                    // - Если price < 1.5, это скорее всего себестоимость (нужно пересчитать)
                    // - Если price >= 1.5 и < 3, проверяем по bundle_name (AT обычно дешевле, TH дороже)
                    // - Если price >= 3, это скорее всего уже финальная цена
                    
                    // Для старых заказов payment_method может быть null, но они все через Telegram Stars
                    const isTelegramStars = !order.payment_method || order.payment_method === 'telegram_stars';
                    let isLikelyCostPrice = false;
                    
                    if (isTelegramStars) {
                        if (order.price < 1.5) {
                            // Очень маленькая цена - точно себестоимость
                            isLikelyCostPrice = true;
                        } else if (order.price >= 1.5 && order.price < 2.5) {
                            // Средняя цена - проверяем по bundle_name
                            // Если bundle_name содержит AT, BE, HU, FR и т.д. (европейские страны), себестоимость обычно 0.9-1.2
                            // Если bundle_name содержит TH (Таиланд), себестоимость обычно 1.5-1.9
                            const bundleName = order.bundle_name || '';
                            const isEuropeanCountry = /_(AT|BE|HU|FR|DE|IT|ES|NL|PL|CZ|SE|NO|DK|FI)_/.test(bundleName);
                            
                            if (isEuropeanCountry && order.price < 1.5) {
                                isLikelyCostPrice = true;
                            } else if (!isEuropeanCountry && order.price < 2.0) {
                                // Для неевропейских стран (TH и т.д.)
                                isLikelyCostPrice = true;
                            }
                        }
                    }
                    
                    if (isLikelyCostPrice) {
                        // Пересчитываем финальную цену
                        const finalPrice = calculateFinalPrice(order.price, baseMarkup, starsMarkup);
                        
                        if (finalPrice) {
                            order.finalPrice = finalPrice;
                            // Обновляем и price, так как это должна быть финальная цена
                            order.price = finalPrice;
                            
                            console.log(`✅ Обновлен заказ ${order.orderReference?.substring(0, 8) || 'N/A'}:`, {
                                bundle_name: order.bundle_name,
                                costPrice: order.price / (baseMarkup * starsMarkup),
                                finalPrice: finalPrice,
                                calculation: `costPrice × ${baseMarkup} × ${starsMarkup} = ${finalPrice}`
                            });
                            
                            updatedCount++;
                        } else {
                            skippedCount++;
                        }
                    } else {
                        // Если price уже выглядит как финальная цена, используем его как finalPrice
                        if (!order.finalPrice || order.finalPrice === order.price) {
                            order.finalPrice = order.price;
                            
                            console.log(`✅ Использован существующий price как finalPrice для заказа ${order.orderReference?.substring(0, 8) || 'N/A'}:`, {
                                bundle_name: order.bundle_name,
                                price: order.price,
                                finalPrice: order.finalPrice
                            });
                            
                            updatedCount++;
                        } else {
                            skippedCount++;
                        }
                    }
                } else {
                    console.warn(`⚠️ Заказ ${order.orderReference?.substring(0, 8) || 'N/A'} не имеет price`);
                    skippedCount++;
                }
            }
        }
        
        // Сохраняем обновленные заказы
        if (updatedCount > 0) {
            console.log(`\n💾 Сохраняю обновленные заказы...`);
            await fs.writeFile(ORDERS_FILE, JSON.stringify(allOrders, null, 2), 'utf8');
            console.log(`✅ Сохранено!`);
        }
        
        console.log(`\n📊 Результаты:`);
        console.log(`   ✅ Обновлено заказов: ${updatedCount}`);
        console.log(`   ⏭️  Пропущено заказов: ${skippedCount}`);
        console.log(`   📦 Всего обработано: ${updatedCount + skippedCount}`);
        
    } catch (error) {
        console.error('❌ Ошибка при обновлении заказов:', error);
        process.exit(1);
    }
}

// Запускаем обновление
updateOrdersFinalPrice();
