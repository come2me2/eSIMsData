/**
 * Shared module for markup settings with cache management
 * Used by plans.js, region-plans.js and can be invalidated from admin settings
 */

const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '..', '..', 'data', 'admin-settings.json');

// Кэш настроек наценок
let markupSettingsCache = null;
let markupSettingsCacheTime = 0;
const MARKUP_CACHE_TTL = 5000; // 5 секунд - короткий TTL для быстрого отклика на изменения

/**
 * Инвалидация кэша настроек наценки
 * Вызывается из api/admin/settings.js при сохранении настроек
 */
function invalidateCache() {
    console.log('[Markup Settings] Cache invalidated');
    markupSettingsCache = null;
    markupSettingsCacheTime = 0;
}

/**
 * Загрузить настройки наценок (с кэшированием)
 * @returns {object} - настройки наценок
 */
function loadMarkupSettings() {
    const now = Date.now();
    if (markupSettingsCache && (now - markupSettingsCacheTime) < MARKUP_CACHE_TTL) {
        return markupSettingsCache;
    }
    
    try {
        let settings;
        try {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
            settings = JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Настройки по умолчанию
                settings = {
                    markup: {
                        enabled: true,
                        base: 1.29,
                        defaultMultiplier: 1.29,
                        countryMarkups: {}
                    }
                };
            } else {
                console.error('[Markup Settings] Error loading settings:', error.message);
                settings = {
                    markup: {
                        enabled: false,
                        base: 1.0,
                        defaultMultiplier: 1.0,
                        countryMarkups: {}
                    }
                };
            }
        }
        
        markupSettingsCache = settings;
        markupSettingsCacheTime = now;
        
        // Логируем загрузку настроек для отладки
        const markup = settings.markup || {};
        console.log(`[Markup Settings] Loaded: enabled=${markup.enabled}, base=${markup.base || markup.defaultMultiplier}`);
        
        return settings;
    } catch (error) {
        console.error('[Markup Settings] Error loading markup settings:', error.message);
        return {
            markup: {
                enabled: false,
                base: 1.0,
                defaultMultiplier: 1.0,
                countryMarkups: {}
            }
        };
    }
}

/**
 * Применить наценку к цене
 * @param {number} price - исходная цена
 * @param {string|null} countryCode - код страны для дополнительной наценки
 * @returns {number} - цена с наценкой
 */
function applyMarkup(price, countryCode = null) {
    try {
        const settings = loadMarkupSettings();
        const markup = settings.markup || {};
        
        // Если наценка отключена, возвращаем цену без изменений
        if (!markup.enabled) {
            return price;
        }
        
        // Получаем базовую наценку
        const baseMarkup = markup.base || markup.defaultMultiplier || 1.0;
        
        // Проверяем наценку по стране
        let countryMarkup = 1.0;
        if (countryCode && markup.countryMarkups && markup.countryMarkups[countryCode]) {
            // Наценка по стране в процентах, конвертируем в множитель
            const countryPercent = markup.countryMarkups[countryCode];
            countryMarkup = 1 + (countryPercent / 100);
        }
        
        // Применяем наценки: цена * базовая наценка * наценка по стране
        const finalPrice = price * baseMarkup * countryMarkup;
        
        return Math.round(finalPrice * 100) / 100; // Округляем до 2 знаков после запятой
    } catch (error) {
        console.error('[Markup Settings] Error applying markup:', error.message);
        return price; // Возвращаем цену без изменений при ошибке
    }
}

/**
 * Применить наценку к массиву планов
 * @param {object} plansData - данные планов {standard: [], unlimited: []}
 * @param {string|null} countryCode - код страны для дополнительной наценки
 * @returns {object} - данные планов с наценкой
 */
function applyMarkupToPlans(plansData, countryCode = null) {
    try {
        const settings = loadMarkupSettings();
        const markup = settings.markup || {};
        
        console.log(`[Markup] Applying markup to plans, enabled: ${markup.enabled}, base: ${markup.base || markup.defaultMultiplier}, countryCode: ${countryCode}`);
        
        if (!markup.enabled) {
            console.log('[Markup] Markup is disabled, returning original prices');
            return plansData;
        }
        
        const baseMarkup = markup.base || markup.defaultMultiplier || 1.0;
        let countryMarkup = 1.0;
        if (countryCode && markup.countryMarkups && markup.countryMarkups[countryCode]) {
            const countryPercent = markup.countryMarkups[countryCode];
            countryMarkup = 1 + (countryPercent / 100);
        }
        
        const totalMarkup = baseMarkup * countryMarkup;
        console.log(`[Markup] Total markup multiplier: ${totalMarkup} (base: ${baseMarkup}, country: ${countryMarkup})`);
        
        // Применяем наценку к стандартным планам
        if (plansData.standard && Array.isArray(plansData.standard)) {
            let appliedCount = 0;
            plansData.standard = plansData.standard.map(plan => {
                if (plan.priceValue && typeof plan.priceValue === 'number') {
                    const oldPrice = plan.priceValue;
                    const newPriceValue = Math.round(plan.priceValue * totalMarkup * 100) / 100;
                    const currency = plan.currency || 'USD';
                    const newPriceFormatted = currency === 'USD' 
                        ? `$ ${newPriceValue.toFixed(2)}`
                        : `${currency} ${newPriceValue.toFixed(2)}`;
                    appliedCount++;
                    if (appliedCount <= 3) {
                        console.log(`[Markup] Applied to standard plan: ${oldPrice} -> ${newPriceValue} (${plan.bundle_name || plan.id})`);
                    }
                    return {
                        ...plan,
                        priceValue: newPriceValue,
                        price: newPriceFormatted
                    };
                }
                return plan;
            });
            console.log(`[Markup] Applied markup to ${appliedCount} standard plans`);
        }
        
        // Применяем наценку к безлимитным планам
        if (plansData.unlimited && Array.isArray(plansData.unlimited)) {
            let appliedCount = 0;
            plansData.unlimited = plansData.unlimited.map(plan => {
                if (plan.priceValue && typeof plan.priceValue === 'number') {
                    const oldPrice = plan.priceValue;
                    const newPriceValue = Math.round(plan.priceValue * totalMarkup * 100) / 100;
                    const currency = plan.currency || 'USD';
                    const newPriceFormatted = currency === 'USD' 
                        ? `$ ${newPriceValue.toFixed(2)}`
                        : `${currency} ${newPriceValue.toFixed(2)}`;
                    appliedCount++;
                    if (appliedCount <= 3) {
                        console.log(`[Markup] Applied to unlimited plan: ${oldPrice} -> ${newPriceValue} (${plan.bundle_name || plan.id})`);
                    }
                    return {
                        ...plan,
                        priceValue: newPriceValue,
                        price: newPriceFormatted
                    };
                }
                return plan;
            });
            console.log(`[Markup] Applied markup to ${appliedCount} unlimited plans`);
        }
        
        return plansData;
    } catch (error) {
        console.error('[Markup] Error applying markup to plans:', error.message);
        return plansData;
    }
}

module.exports = {
    loadMarkupSettings,
    applyMarkup,
    applyMarkupToPlans,
    invalidateCache
};

