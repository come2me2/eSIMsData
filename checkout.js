// Telegram Web App initialization
let tg = window.Telegram.WebApp;

// Initialize Telegram Web App
if (tg) {
    tg.ready();
    tg.expand();
    
    // Set theme colors (only if supported in this version)
    try {
        if (tg.setHeaderColor && tg.version && parseFloat(tg.version) >= 6.1) {
            tg.setHeaderColor('#FFFFFF');
        }
    } catch (e) {
        // Ignore if not supported
    }
    try {
        if (tg.setBackgroundColor && tg.version && parseFloat(tg.version) >= 6.1) {
            tg.setBackgroundColor('#F2F2F7');
        }
    } catch (e) {
        // Ignore if not supported
    }
    
    // Показываем кнопку "назад" в Telegram
    // Обработчик будет установлен после загрузки orderData в DOMContentLoaded
}

// Get order data from URL
const urlParams = new URLSearchParams(window.location.search);
const orderData = {
    type: urlParams.get('type') || 'country', // country, region, global
    name: urlParams.get('name') || '',
    code: urlParams.get('code') || '',
    planId: urlParams.get('plan') || '',
    planType: urlParams.get('planType') || 'standard'
};

// Plans data - загружаются динамически из API
let standardPlans = [];
let unlimitedPlans = [];

/**
 * Загрузка реальных планов для checkout:
 * - country: local plans по коду страны
 * - region: region plans по названию региона
 * - global: global plans
 *
 * Приоритет: DataLoader (static JSON) -> API.
 */
async function loadPlansForCheckout() {
    console.log('🔵 loadPlansForCheckout called with orderData:', orderData);

    try {
        let data = null;

        if (window.DataLoader) {
            if (orderData.type === 'country' && orderData.code && typeof window.DataLoader.loadLocalPlans === 'function') {
                data = await window.DataLoader.loadLocalPlans(orderData.code);
            } else if (orderData.type === 'region' && orderData.name && typeof window.DataLoader.loadRegionPlans === 'function') {
                data = await window.DataLoader.loadRegionPlans(orderData.name);
            } else if (orderData.type === 'global' && typeof window.DataLoader.loadGlobalPlans === 'function') {
                data = await window.DataLoader.loadGlobalPlans();
            }
        }

        // Fallback: direct API for country (legacy)
        if (!data && orderData.type === 'country') {
            const params = new URLSearchParams();
            if (orderData.code) params.append('country', orderData.code);
            params.append('category', 'local');
        const apiUrl = `/api/esimgo/plans?${params.toString()}`;
            const response = await fetch(apiUrl);
            const result = await response.json();
            if (result.success && result.data) data = result.data;
        }
        
        // Fallback: direct API for region
        if (!data && orderData.type === 'region' && orderData.name) {
            const apiUrl = `/api/esimgo/region-plans?region=${encodeURIComponent(orderData.name)}`;
        const response = await fetch(apiUrl);
            const result = await response.json();
            if (result.success && result.data) data = result.data;
        }
        
        // Fallback: direct API for global
        if (!data && orderData.type === 'global') {
            const apiUrl = `/api/esimgo/plans?category=global`;
            const response = await fetch(apiUrl);
        const result = await response.json();
            if (result.success && result.data) data = result.data;
        }

        if (data) {
            standardPlans = data.standard || [];
            unlimitedPlans = data.unlimited || [];

            // Сортируем unlimited планы по duration и data для консистентности
            if (unlimitedPlans.length > 0) {
                unlimitedPlans.sort((a, b) => {
                    // Сначала по duration (7 Days перед 30 Days)
                    const durationA = parseInt(a.duration?.match(/\d+/)?.[0] || '0');
                    const durationB = parseInt(b.duration?.match(/\d+/)?.[0] || '0');
                    if (durationA !== durationB) {
                        return durationA - durationB;
                    }
                    // Если duration одинаковый, сортируем по data (если есть различия)
                    return (a.data || '').localeCompare(b.data || '');
                });
            }

            // Добавляем ID для совместимости (если нет)
            standardPlans.forEach((plan, index) => { if (!plan.id) plan.id = `plan${index + 1}`; });
            unlimitedPlans.forEach((plan, index) => { if (!plan.id) plan.id = `unlimited${index + 1}`; });

            console.log('✅ Plans loaded for checkout:', {
                type: orderData.type,
                name: orderData.name,
                code: orderData.code,
                planId: orderData.planId,
                planType: orderData.planType,
                standard: standardPlans.length,
                unlimited: unlimitedPlans.length,
                unlimitedPlans: unlimitedPlans.map(p => ({ id: p.id, data: p.data, duration: p.duration, price: p.price }))
            });
            
            return true;
        }
    } catch (error) {
        console.error('❌ Error loading checkout plans:', error);
    }

    // Hard fallback (kept minimal)
    standardPlans = [];
    unlimitedPlans = [];
        return false;
}

// Store original price and discount state
let originalPrice = '';
let isPromoApplied = false;
let discountPercent = 0;
let discountAmount = 0; // Discount amount in dollars
let appliedPromocode = null; // Applied promocode data
let publicSettings = null; // Настройки наценок

// Загрузка публичных настроек (наценки на способы оплаты)
async function loadPublicSettings() {
    if (publicSettings) return publicSettings;
    
    try {
        const response = await fetch('/api/settings/public');
        const data = await response.json();
        if (data.success) {
            // API возвращает markup и paymentMethods на верхнем уровне
            publicSettings = {
                markup: data.markup,
                paymentMethods: data.paymentMethods
            };
            console.log('✅ Public settings loaded:', publicSettings);
        }
    } catch (error) {
        console.error('Error loading public settings:', error);
    }
    return publicSettings;
}

// ===== Payment method (UI only for now) =====
const PAYMENT_METHODS = {
    stars: 'Telegram Stars',
    stripe: 'Bank Cards',
    cryptomus: 'Crypto Payments'
};

let selectedPaymentMethod = localStorage.getItem('checkout_payment_method') || '';
if (selectedPaymentMethod && !PAYMENT_METHODS[selectedPaymentMethod]) {
    // reset old values from previous versions (card/ton/etc)
    selectedPaymentMethod = '';
    localStorage.removeItem('checkout_payment_method');
}

function filterAvailablePaymentMethods() {
    // Скрываем недоступные способы оплаты на основе настроек админки
    if (!publicSettings || !publicSettings.paymentMethods) {
        console.warn('⚠️ No public settings loaded, all payment methods will be shown');
        return;
    }
    
    const paymentMethodsMapping = {
        'stars': 'telegramStars',
        'stripe': 'bankCard',
        'cryptomus': 'crypto'
    };
    
    const items = document.querySelectorAll('.sheet-item[data-payment-method]');
    console.log('[Payment Methods] Filtering payment methods:', {
        settings: publicSettings.paymentMethods,
        items: items.length
    });
    
    items.forEach(item => {
        const methodKey = item.getAttribute('data-payment-method');
        const settingsKey = paymentMethodsMapping[methodKey];
        
        if (settingsKey && publicSettings.paymentMethods[settingsKey]) {
            const methodSettings = publicSettings.paymentMethods[settingsKey];
            const isEnabled = methodSettings.enabled !== false; // По умолчанию включен если не указано
            
            if (!isEnabled) {
                item.style.display = 'none';
                console.log(`[Payment Methods] ✗ Disabled: ${methodKey} (${settingsKey})`);
            } else {
                item.style.display = '';
                console.log(`[Payment Methods] ✓ Enabled: ${methodKey} (${settingsKey})`);
            }
        } else {
            // Если нет настроек для этого метода, показываем его по умолчанию
            item.style.display = '';
            console.log(`[Payment Methods] ℹ No settings for: ${methodKey}, showing by default`);
        }
    });
}

function setupPaymentMethodUI() {
    const btn = document.getElementById('paymentMethodBtn');
    const subtitle = document.getElementById('paymentMethodSubtitle');
    const icon = document.querySelector('#paymentMethodBtn .payment-method-icon');
    const overlay = document.getElementById('paymentSheetOverlay');
    const sheet = document.getElementById('paymentSheet');
    const closeBtn = document.getElementById('paymentSheetClose');
    const list = document.getElementById('paymentSheetList');

    if (!btn || !subtitle || !overlay || !sheet || !closeBtn || !list) {
        console.error('❌ Payment method UI elements not found:', {
            btn: !!btn,
            subtitle: !!subtitle,
            overlay: !!overlay,
            sheet: !!sheet,
            closeBtn: !!closeBtn,
            list: !!list
        });
        return;
    }
    
    // Фильтруем доступные способы оплаты
    filterAvailablePaymentMethods();
    
    console.log('✅ Payment method UI initialized');

    const getIconPath = (method) => {
        if (method === 'stars') {
            return '/icons/Telegram Stars.svg';
        }
        if (method === 'stripe') {
            return '/icons/Bank Cards eSIMsData.svg';
        }
        if (method === 'cryptomus') {
            return '/icons/Crypto Payments eSIMsData.svg';
        }
        // default icon (до выбора метода)
        return '/icons/Payment Method eSIMsData.svg';
    };

    const iconHtml = (method) => {
        const iconPath = getIconPath(method);
        return `<img src="${iconPath}" alt="${PAYMENT_METHODS[method] || 'Payment method'}" style="width:100%;height:100%;object-fit:contain;">`;
    };

    const updateSubtitle = () => {
        subtitle.textContent = PAYMENT_METHODS[selectedPaymentMethod] || 'Not selected';
        
        // Добавляем/убираем класс для активного состояния
        if (selectedPaymentMethod) {
            btn.setAttribute('data-selected', 'true');
        } else {
            btn.removeAttribute('data-selected');
        }
        
        if (icon) {
            // keep container styling; swap contents
            const iconPath = getIconPath(selectedPaymentMethod);
            console.log('💳 Updating payment method icon:', {
                method: selectedPaymentMethod || 'default',
                iconPath
            });
            icon.innerHTML = iconHtml(selectedPaymentMethod);
            
            // Проверяем, что иконка загрузилась
            const img = icon.querySelector('img');
            if (img) {
                img.onerror = function() {
                    console.error('❌ Failed to load payment icon:', iconPath);
                    // Fallback на дефолтную иконку
                    this.src = '/icons/Payment Method eSIMsData.svg';
                };
                img.onload = function() {
                    console.log('✅ Payment icon loaded:', iconPath);
                };
            }
        }
    };

    const syncSelected = () => {
        const items = list.querySelectorAll('.sheet-item');
        items.forEach(item => {
            const key = item.getAttribute('data-payment-method');
            if (key === selectedPaymentMethod) item.classList.add('selected');
            else item.classList.remove('selected');
        });
    };

    const open = () => {
        console.log('💳 Opening payment method sheet');
        console.log('💳 Overlay:', overlay, 'hidden:', overlay?.hidden);
        console.log('💳 Sheet:', sheet, 'hidden:', sheet?.hidden);
        
        if (!overlay || !sheet) {
            console.error('❌ Overlay or sheet not found!');
            return;
        }
        
        overlay.hidden = false;
        sheet.hidden = false;
        document.body.style.overflow = 'hidden';
        syncSelected();

        // Start transition on next frame (ensures CSS applies before adding class)
        requestAnimationFrame(() => {
            overlay.classList.add('is-open');
            sheet.classList.add('is-open');
            console.log('✅ Sheet opened, classes added. Overlay hidden:', overlay.hidden, 'Sheet hidden:', sheet.hidden);
        });

        if (tg) {
            try {
                tg.HapticFeedback.impactOccurred('light');
            } catch (e) {
                console.warn('⚠️ HapticFeedback error:', e);
            }
        }
    };

    const close = () => {
        // animate out, then hide
        overlay.classList.remove('is-open');
        sheet.classList.remove('is-open');

        const finish = () => {
            overlay.hidden = true;
            sheet.hidden = true;
            document.body.style.overflow = '';
        };

        // If reduced motion or transitions not supported, finish immediately
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReduced) {
            finish();
            return;
        }

        let done = false;
        const onEnd = () => {
            if (done) return;
            done = true;
            sheet.removeEventListener('transitionend', onEnd);
            finish();
        };
        sheet.addEventListener('transitionend', onEnd);

        // Safety timeout (in case transitionend doesn't fire in WebView)
        setTimeout(onEnd, 300);
    };

    // Обработчик открытия модального окна
    btn.addEventListener('click', (e) => {
        console.log('💳 Payment method button clicked');
        e.preventDefault();
        e.stopPropagation();
        open();
    });
    
    // Для touch устройств
    btn.addEventListener('touchend', (e) => {
        console.log('💳 Payment method button touched');
        e.preventDefault();
        e.stopPropagation();
        open();
    });
    
    const handleClose = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        close();
        return false;
    };
    
    closeBtn.addEventListener('click', handleClose, true);
    closeBtn.addEventListener('touchstart', handleClose, { passive: false, capture: true });
    closeBtn.onclick = handleClose;
    
    overlay.addEventListener('click', handleClose, true);
    overlay.addEventListener('touchstart', handleClose, { passive: false, capture: true });
    overlay.onclick = handleClose;

    // ESC to close (desktop)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !sheet.hidden) close();
    });

    list.addEventListener('click', (e) => {
        const item = e.target.closest('.sheet-item');
        if (!item) return;
        const key = item.getAttribute('data-payment-method');
        if (!key) return;
        selectedPaymentMethod = key;
        localStorage.setItem('checkout_payment_method', selectedPaymentMethod);
        updateSubtitle();
        syncSelected();
        if (tg) tg.HapticFeedback.impactOccurred('light');
        close();
    });

    updateSubtitle();
    syncSelected();
}

/**
 * Поиск bundle name по параметрам
 */
async function findBundleName(countryCode, dataAmount, duration, unlimited = false) {
    try {
        const params = new URLSearchParams({
            country: countryCode,
            dataAmount: dataAmount.toString(),
            duration: duration.toString(),
            unlimited: unlimited.toString()
        });
        
        const response = await fetch(`/api/esimgo/find-bundle?${params.toString()}`);
        const data = await response.json();
        
        if (!data.success || !data.data?.bundleName) {
            throw new Error(data.error || 'Bundle not found');
        }
        
        return data.data.bundleName;
    } catch (error) {
        console.error('Error finding bundle:', error);
        throw error;
    }
}

/**
 * Инициирование оплаты через Telegram Stars
 */
async function initiateStarsPayment(auth) {
    const purchaseBtn = document.getElementById('purchaseBtn');
    const originalText = purchaseBtn.textContent;
    
    // Проверка, что мы в Telegram Web App
    if (!tg || !tg.openInvoice) {
        alert('Оплата через Telegram Stars доступна только внутри Telegram');
        return;
    }
    
    try {
        purchaseBtn.textContent = 'Creating invoice...';
        purchaseBtn.disabled = true;
        
        if (tg) {
            tg.HapticFeedback.impactOccurred('medium');
        }
        
        // Получаем выбранный план
        const plans = orderData.planType === 'unlimited' ? unlimitedPlans : standardPlans;
        
        // Улучшенная логика поиска плана
        let selectedPlan = plans.find(p => p.id === orderData.planId || p.bundle_name === orderData.planId);
        
        // Если план не найден и это unlimited план с ID вида unlimitedN, пытаемся найти по индексу
        if (!selectedPlan && orderData.planType === 'unlimited' && orderData.planId) {
            const idMatch = orderData.planId.match(/unlimited(\d+)/);
            if (idMatch) {
                const index = parseInt(idMatch[1]) - 1; // unlimited1 = index 0, unlimited2 = index 1, etc.
                if (index >= 0 && index < plans.length) {
                    selectedPlan = plans[index];
                }
            }
        }
        
        if (!selectedPlan) {
            throw new Error(`Plan not found: planId=${orderData.planId}, planType=${orderData.planType}, available plans: ${plans.length}`);
        }
        
        // Получаем bundle_name
        let bundleName = selectedPlan.bundle_name;
        if (!bundleName) {
            // Для Region и Global планов bundle_name должен быть в самом плане
            // Если его нет, используем plan_id как fallback
            if (orderData.type === 'region' || orderData.type === 'global') {
                bundleName = selectedPlan.id || orderData.planId;
                console.log('💫 Using plan ID as bundle_name for region/global:', bundleName);
            } else {
                // Для country планов пытаемся найти bundle через API
                let countryCodeForBundle = orderData.code;
                if (countryCodeForBundle) {
                    try {
                        bundleName = await findBundleName(
                            countryCodeForBundle,
                            selectedPlan.dataAmount || (parseInt(selectedPlan.data.match(/\d+/)?.[0] || '0') * 1000),
                            selectedPlan.durationDays || parseInt(selectedPlan.duration.match(/\d+/)?.[0] || '0'),
                            orderData.planType === 'unlimited'
                        );
                    } catch (error) {
                        console.warn('⚠️ Could not find bundle via API, using plan ID:', error);
                        bundleName = selectedPlan.id || orderData.planId;
                    }
                } else {
                    bundleName = selectedPlan.id || orderData.planId;
                }
            }
        }
        
        // Валидация bundle_name для Region и Global
        if (!bundleName || bundleName.trim() === '') {
            throw new Error(`Bundle name is required. planId=${orderData.planId}, selectedPlan.id=${selectedPlan.id}`);
        }
        
        // Получаем себестоимость тарифа
        // ⚠️ ВАЖНО: Для расчета Stars нужна СЕБЕСТОИМОСТЬ (cost), а не финальная цена!
        // 
        // Для Region и Global планов priceValue может быть финальной ценой (с маржой),
        // поэтому нужно убрать маржу: себестоимость = финальная_цена / (1 + маржа)
        // 
        // Для Local планов priceValue обычно уже себестоимость (cost)
        let costPrice = selectedPlan.priceValue;
        
        // Если priceValue нет, пытаемся получить из price строки
        if (!costPrice && selectedPlan.price) {
            const priceMatch = selectedPlan.price.toString().match(/([\d.,]+)/);
            if (priceMatch) {
                costPrice = parseFloat(priceMatch[1].replace(',', '.'));
            }
        }
        
        // Для Region и Global планов priceValue обычно финальная цена (с маржой)
        // Убираем маржу, чтобы получить себестоимость
        if (costPrice && (orderData.type === 'region' || orderData.type === 'global')) {
            // Если это финальная цена, убираем маржу: cost = price / (1 + margin)
            // Маржа = 29% = 0.29
            const MARGIN = 0.29;
            costPrice = costPrice / (1 + MARGIN);
            console.log('💫 Converted final price to cost for region/global:', {
                originalPrice: selectedPlan.priceValue || selectedPlan.price,
                costPrice: costPrice,
                margin: MARGIN
            });
        }
        
        if (!costPrice || costPrice <= 0) {
            throw new Error('Invalid plan cost. Please contact support.');
        }
        
        console.log('💫 Initiating Stars payment:', {
            plan: selectedPlan,
            bundleName,
            costPrice,
            priceValue: selectedPlan.priceValue,
            price: selectedPlan.price,
            country: orderData.code,
            type: orderData.type
        });
        
        // Валидация данных Telegram
        const validation = await auth.validateOnServer('/api/validate-telegram');
        if (!validation.valid) {
            throw new Error(validation.error || 'Validation failed');
        }
        
        // Создаем инвойс через API
        purchaseBtn.textContent = 'Creating invoice...';
        
        // Для Region и Global используем короткие коды без пробелов
        let countryCode = orderData.code;
        if (!countryCode && orderData.type === 'region') {
            // Маппинг регионов на короткие коды без пробелов для Telegram API
            const regionCodeMap = {
                'Africa': 'AFRICA',
                'Asia': 'ASIA',
                'Europe': 'EUROPE',
                'Latin America': 'LATAM',
                'North America': 'NA',
                'Balkanas': 'BALKANAS',
                'Central Eurasia': 'CIS',
                'Oceania': 'OCEANIA'
            };
            // Используем маппинг или преобразуем название в код (убираем пробелы, делаем uppercase)
            countryCode = regionCodeMap[orderData.name] || (orderData.name || 'REGION').replace(/\s+/g, '').toUpperCase();
        } else if (!countryCode && orderData.type === 'global') {
            // Для глобальных планов используем "GLOBAL"
            countryCode = 'GLOBAL';
        }
        
        // Валидация всех обязательных полей перед отправкой
        if (!orderData.planId) {
            throw new Error('plan_id is required');
        }
        if (!orderData.planType) {
            throw new Error('plan_type is required');
        }
        if (!bundleName || bundleName.trim() === '') {
            throw new Error('bundle_name is required');
        }
        if (!countryCode || countryCode.trim() === '') {
            throw new Error('country_code is required');
        }
        if (!costPrice || costPrice <= 0) {
            throw new Error(`price (cost) is required and must be > 0. Current value: ${costPrice}`);
        }
        
        const requestPayload = {
            plan_id: orderData.planId,
            plan_type: orderData.planType,
            bundle_name: bundleName,
            country_code: countryCode,
            country_name: orderData.name || (orderData.type === 'global' ? 'Global' : orderData.name || ''),
            price: costPrice, // ⚠️ Себестоимость тарифа
            currency: 'USD',
            telegram_user_id: auth.getUserId(),
            telegram_username: auth.getUsername()
        };
        
        console.log('💫 Stars payment request payload:', requestPayload);
        
        // Создаем AbortController для таймаута (30 секунд)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        let invoiceResponse;
        try {
            invoiceResponse = await fetch('/api/telegram/stars/create-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestPayload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                throw new Error('Request timeout. Please try again.');
            }
            throw new Error('Network error: ' + fetchError.message);
        }
        
        const invoiceResult = await invoiceResponse.json();
        
        if (!invoiceResult.success || !invoiceResult.invoiceLink) {
            throw new Error(invoiceResult.error || 'Failed to create invoice');
        }
        
        console.log('✅ Invoice created:', {
            invoiceLink: invoiceResult.invoiceLink,
            amountStars: invoiceResult.amountStars
        });
        
        // Восстанавливаем кнопку
        purchaseBtn.textContent = originalText;
        purchaseBtn.disabled = false;
        
        // Для Stars createInvoiceLink возвращает полный URL вида https://t.me/invoice/...
        // tg.openInvoice() принимает либо slug (последняя часть URL), либо полный URL
        const invoiceLink = invoiceResult.invoiceLink;
        console.log('💫 Invoice link:', invoiceLink);
        
        // Проверяем формат ссылки
        let invoiceId;
        if (invoiceLink.startsWith('https://t.me/invoice/')) {
            // Извлекаем slug из полного URL
            invoiceId = invoiceLink.split('/').pop();
        } else if (invoiceLink.startsWith('invoice/')) {
            // Уже в формате invoice/...
            invoiceId = invoiceLink.replace('invoice/', '');
        } else {
            // Пробуем использовать как есть
            invoiceId = invoiceLink;
        }
        
        console.log('💫 Invoice ID to open:', invoiceId);
        
        // Открываем инвойс через Telegram
        const invoiceCallback = (status) => {
            console.log('💫 Invoice status:', status);
            
            if (status === 'paid') {
                // Успешная оплата - заказ будет создан через webhook
                if (tg) {
                    tg.HapticFeedback.notificationOccurred('success');
                    tg.showAlert('✅ Payment successful! Your eSIM will be sent to you shortly.');
                }
                // Редирект на страницу My eSIMs после успешной оплаты
                setTimeout(() => {
                    window.location.href = 'my-esims.html';
                }, 2000);
            } else if (status === 'cancelled') {
                // Пользователь отменил оплату
                if (tg) {
                    tg.HapticFeedback.notificationOccurred('error');
                    tg.showAlert('Payment cancelled.');
                }
            } else if (status === 'failed') {
                // Ошибка оплаты
                if (tg) {
                    tg.HapticFeedback.notificationOccurred('error');
                    tg.showAlert('Payment failed. Please try again.');
                }
            } else if (status === 'pending') {
                // Платеж в обработке
                console.log('Payment is pending...');
            }
        };
        
        // Открываем инвойс (передаем slug)
        try {
            tg.openInvoice(invoiceId, invoiceCallback);
        } catch (error) {
            console.error('❌ openInvoice error:', error);
            // Пробуем передать полный URL
            if (invoiceLink.startsWith('https://')) {
                tg.openInvoice(invoiceLink, invoiceCallback);
            } else {
                throw new Error('Invalid invoice format: ' + invoiceLink);
            }
        }
        
    } catch (error) {
        console.error('❌ Stars payment error:', error);
        
        // Восстанавливаем кнопку
        purchaseBtn.textContent = originalText;
        purchaseBtn.disabled = false;
        
        if (tg) {
            tg.HapticFeedback.notificationOccurred('error');
            tg.showAlert('Error: ' + error.message);
        } else {
            alert('Error: ' + error.message);
        }
    }
}

/**
 * Обработка покупки (legacy метод для других способов оплаты)
 */
async function processPurchase(orderWithUser, auth, tg) {
    const purchaseBtn = document.getElementById('purchaseBtn');
    const originalText = purchaseBtn.textContent;
    
    try {
        purchaseBtn.textContent = 'Processing...';
        purchaseBtn.disabled = true;
        
        if (tg) {
            tg.HapticFeedback.impactOccurred('medium');
        }
        
        // Определяем параметры плана
        const plans = orderWithUser.planType === 'unlimited' ? unlimitedPlans : standardPlans;
        
        // Улучшенная логика поиска плана
        let selectedPlan = plans.find(p => p.id === orderWithUser.planId || p.bundle_name === orderWithUser.planId);
        
        // Если план не найден и это unlimited план с ID вида unlimitedN, пытаемся найти по индексу
        if (!selectedPlan && orderWithUser.planType === 'unlimited' && orderWithUser.planId) {
            const idMatch = orderWithUser.planId.match(/unlimited(\d+)/);
            if (idMatch) {
                const index = parseInt(idMatch[1]) - 1; // unlimited1 = index 0, unlimited2 = index 1, etc.
                if (index >= 0 && index < plans.length) {
                    selectedPlan = plans[index];
                }
            }
        }
        
        if (!selectedPlan) {
            throw new Error(`Plan not found: planId=${orderWithUser.planId}, planType=${orderWithUser.planType}, available plans: ${plans.length}`);
        }
        
        // Если у плана есть bundle_name (из API), используем его напрямую
        let bundleName;
        if (selectedPlan.bundle_name) {
            bundleName = selectedPlan.bundle_name;
            console.log('Using bundle_name from plan:', bundleName);
        } else {
            // Fallback: парсим данные и ищем bundle
            const dataMatch = selectedPlan.data.match(/(\d+)/);
            const durationMatch = selectedPlan.duration.match(/(\d+)/);
            
            if (!dataMatch || !durationMatch) {
                throw new Error('Invalid plan format');
            }
            
            const dataAmountMB = parseInt(dataMatch[1]) * 1000; // GB to MB
            const durationDays = parseInt(durationMatch[1]);
            const isUnlimited = orderWithUser.planType === 'unlimited';
            
            // Ищем bundle name
            purchaseBtn.textContent = 'Finding bundle...';
            bundleName = await findBundleName(
                orderWithUser.code,
                dataAmountMB,
                durationDays,
                isUnlimited
            );
            console.log('Found bundle:', bundleName);
        }
        
        // Проверяем режим тестирования (можно установить через localStorage или URL параметр)
        const urlParams = new URLSearchParams(window.location.search);
        const testMode = urlParams.get('test') === 'true' || 
                        localStorage.getItem('esimgo_test_mode') === 'true' ||
                        false; // По умолчанию false (реальный заказ)
        
        if (testMode) {
            console.warn('⚠️ TEST MODE: Order will be validated but not created');
        }
        
        // Получаем базовую цену провайдера (до наценок)
        let providerBasePriceUsd = null;
        if (selectedPlan.basePrice !== undefined && selectedPlan.basePrice !== null) {
            providerBasePriceUsd = parseFloat(selectedPlan.basePrice);
        } else if (selectedPlan.priceValue) {
            // Если basePrice нет, используем priceValue как базовую цену
            providerBasePriceUsd = parseFloat(selectedPlan.priceValue);
        } else if (selectedPlan.price) {
            // Извлекаем числовое значение из строки цены
            const priceMatch = selectedPlan.price.toString().match(/([\d.,]+)/);
            if (priceMatch) {
                providerBasePriceUsd = parseFloat(priceMatch[1].replace(',', '.'));
            }
        }
        
        // Создаем заказ
        purchaseBtn.textContent = testMode ? 'Validating order...' : 'Creating order...';
        
        // Подготовка данных заказа
        const orderPayload = {
            bundle_name: bundleName,
            telegram_user_id: orderWithUser.telegram_user_id,
            telegram_username: orderWithUser.telegram_username,
            user_name: orderWithUser.user_name,
            country_code: orderWithUser.code,
            country_name: orderWithUser.name,
            plan_id: orderWithUser.planId,
            plan_type: orderWithUser.planType,
            test_mode: testMode, // Передаем режим тестирования
            payment_method: selectedPaymentMethod || null,
            provider_base_price_usd: providerBasePriceUsd
        };
        
        // Добавляем промокод, если применён
        if (isPromoApplied && appliedPromocode) {
            orderPayload.promocode = appliedPromocode.code;
            orderPayload.discount_amount = discountAmount;
            orderPayload.discount_percent = discountPercent;
        }
        
        const orderResponse = await fetch('/api/esimgo/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });
        
        const orderResult = await orderResponse.json();
        
        if (!orderResult.success) {
            throw new Error(orderResult.error || 'Failed to create order');
        }
        
        // Проверяем режим тестирования
        if (orderResult.test_mode) {
            console.log('✅ Order validated (TEST MODE):', orderResult.data);
            
            // В тестовом режиме показываем информацию о валидации
            if (tg) {
                tg.showAlert(
                    `✅ Validation successful!\n\n` +
                    `Price: ${orderResult.data.currency} ${orderResult.data.total}\n` +
                    `Bundle: ${bundleName}\n\n` +
                    `This was a test. No real order was created.\n` +
                    `Remove ?test=true from URL to create real orders.`
                );
            } else {
                alert(
                    `✅ Validation successful!\n\n` +
                    `Price: ${orderResult.data.currency} ${orderResult.data.total}\n` +
                    `Bundle: ${bundleName}\n\n` +
                    `This was a test. No real order was created.`
                );
            }
            
            purchaseBtn.textContent = originalText;
            purchaseBtn.disabled = false;
            return; // Не продолжаем с получением QR кода в тестовом режиме
        }
        
        console.log('Order created:', orderResult.data);
        
        // Если есть assignments (QR код), показываем их
        if (orderResult.data.assignments) {
            showOrderSuccess(orderResult.data, tg);
        } else if (orderResult.data.orderReference) {
            // Если assignments не получены сразу, получаем их отдельно
            purchaseBtn.textContent = 'Getting QR code...';
            await getAndShowAssignments(orderResult.data.orderReference, tg);
        } else {
            throw new Error('Order created but no eSIM data received');
        }
        
        if (tg) {
            tg.HapticFeedback.notificationOccurred('success');
        }
        
    } catch (error) {
        console.error('Purchase failed:', error);
        
        purchaseBtn.textContent = originalText;
        purchaseBtn.disabled = false;
        
        if (tg) {
            tg.HapticFeedback.notificationOccurred('error');
            tg.showAlert('Purchase failed: ' + error.message);
        } else {
            alert('Purchase failed: ' + error.message);
        }
    }
}

/**
 * Получить и показать assignments (QR код)
 */
async function getAndShowAssignments(orderReference, tg) {
    try {
        const response = await fetch(`/api/esimgo/assignments?reference=${orderReference}`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to get assignments');
        }
        
        showOrderSuccess({ assignments: data.data, orderReference }, tg);
    } catch (error) {
        console.error('Failed to get assignments:', error);
        throw error;
    }
}

/**
 * Показать успешный заказ с QR кодом
 */
function showOrderSuccess(orderData, tg) {
    // TODO: Создать страницу или модальное окно для показа QR кода
    // Пока просто перенаправляем на страницу успеха
    const assignments = orderData.assignments;
    
    if (assignments && assignments.iccid) {
        // Сохраняем в localStorage для отображения в my-esims
        const orderInfo = {
            iccid: assignments.iccid,
            matchingId: assignments.matchingId,
            smdpAddress: assignments.smdpAddress,
            orderReference: orderData.orderReference,
            createdAt: new Date().toISOString()
        };
        
        // Получаем существующие заказы
        const existingOrders = JSON.parse(localStorage.getItem('esim_orders') || '[]');
        existingOrders.push(orderInfo);
        localStorage.setItem('esim_orders', JSON.stringify(existingOrders));
        
        // Перенаправляем на страницу успеха или my-esims
        if (tg) {
            tg.showAlert('Order successful! Check "My eSIMs" for QR code.');
            setTimeout(() => {
                window.location.href = 'my-esims.html';
            }, 2000);
        } else {
            alert('Order successful! Check "My eSIMs" for QR code.');
            window.location.href = 'my-esims.html';
        }
    }
}

// Region icon file mapping
const regionIconMap = {
    'Africa': 'Afrrica.png',
    'Asia': 'Asia.png',
    'Europe': 'Europe.png',
    'Latin America': 'Latin America.png',
    'North America': 'North America.png',
    'Balkanas': 'Balkanas.png',
    'Central Eurasia': 'Central Eurasia.png',
    'Oceania': 'Oceania.png'
};

// Version for cache busting - increment when flags are updated
const FLAG_VERSION = 'v7'; // Updated: force refresh for missing flags (AX, BM, etc.)

// Function to get flag image URL from local flags folder
function getFlagPath(countryCode) {
    if (!countryCode) {
        return null;
    }
    // Файлы в верхнем регистре: AF.svg, TH.svg и т.д.
    let code = countryCode.toUpperCase();
    
    // Специальная обработка для файлов с пробелами или специальными символами
    const specialFlagFiles = {
        'CYP': 'CYP;CY .svg',  // Northern Cyprus файл с пробелом
        'US-HI': 'US-HI .svg'  // Hawaii файл с пробелом
    };
    
    // Если есть специальный файл, используем его
    // Кодируем пробелы и специальные символы в URL
    if (specialFlagFiles[code]) {
        const fileName = specialFlagFiles[code];
        const encodedFileName = encodeURIComponent(fileName);
        return `/flags/${encodedFileName}?${FLAG_VERSION}`;
    }
    
    return `/flags/${code}.svg?${FLAG_VERSION}`;
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Telegram Auth - проверка авторизации перед оформлением заказа
    const auth = window.telegramAuth;
    if (auth && auth.isAuthenticated()) {
        const userId = auth.getUserId();
        console.log('Checkout - User authenticated:', userId);
        window.currentUserId = userId;
    } else {
        console.warn('Checkout - User not authenticated');
        // Можно показать предупреждение или перенаправить
    }
    
    // Загружаем реальные планы для checkout
    console.log('🔵 DOMContentLoaded - orderData:', orderData);
    const plansLoaded = await loadPlansForCheckout();
    
    // Загружаем публичные настройки (наценки на способы оплаты)
    await loadPublicSettings();
    
    console.log('🔵 Plans loaded status:', plansLoaded, {
        standardCount: standardPlans.length,
        unlimitedCount: unlimitedPlans.length,
        firstPlan: standardPlans[0] || unlimitedPlans[0]
    });
    
    setupOrderDetails();
    setupPromoCode();
    setupPaymentMethodUI();
    setupPurchaseButton();
    setupNavigation();
    setupBackButton();
    
    // Убеждаемся, что нижнее меню всегда видно
    ensureBottomNavVisible();
    setTimeout(ensureBottomNavVisible, 100);
    
    // Если планы загрузились, обновляем отображение
    if (plansLoaded && (standardPlans.length > 0 || unlimitedPlans.length > 0)) {
        updateOrderDetailsWithRealPlans();
    }
});

// Setup back button to return to plans page
function setupBackButton() {
    if (!tg || !tg.BackButton) {
        return;
    }
    
    tg.BackButton.show();
    tg.BackButton.onClick(() => {
        if (tg && tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
        
        // Возвращаемся на соответствующую страницу со списком тарифов
        if (orderData.type === 'country') {
            // Local: возвращаемся на plans.html с параметрами страны
            const params = new URLSearchParams({
                country: orderData.name,
                code: orderData.code
            });
            window.location.href = `plans.html?${params.toString()}`;
        } else if (orderData.type === 'region') {
            // Region: возвращаемся на region-plans.html с параметром региона
            const params = new URLSearchParams({
                region: orderData.name
            });
            window.location.href = `region-plans.html?${params.toString()}`;
        } else if (orderData.type === 'global') {
            // Global: возвращаемся на global-plans.html
            window.location.href = 'global-plans.html';
        } else {
            // Fallback: возвращаемся на главную
            window.location.href = 'index.html?segment=local';
        }
    });
}

// Ensure bottom navigation is always visible
function ensureBottomNavVisible() {
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        bottomNav.style.display = 'flex';
        bottomNav.style.visibility = 'visible';
        bottomNav.style.opacity = '1';
        bottomNav.style.position = 'fixed';
        bottomNav.style.bottom = '0';
        bottomNav.style.zIndex = '10000'; // Нижнее меню должно быть видно
    }
}

// Setup bottom navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const label = item.querySelector('.nav-label').textContent;
            handleNavigationClick(label);
        });
    });
}

// Handle navigation click
function handleNavigationClick(section) {
    if (tg) {
        tg.HapticFeedback.impactOccurred('light');
    }
    
    const navigate = window.optimizedNavigate || ((url) => { window.location.href = url; });
    
    if (section === 'Account') {
        navigate('account.html');
    } else if (section === 'Buy eSIM') {
        navigate('index.html');
    } else if (section === 'Help') {
        navigate('help.html');
    }
}

// Setup order details
function setupOrderDetails() {
    const headerElement = document.getElementById('checkoutHeader');
    const planDetailsElement = document.getElementById('checkoutPlanDetails');
    const totalPriceElement = document.getElementById('checkoutTotalPrice');
    
    // Setup location info in header
    if (orderData.type === 'country') {
        const flagPath = getFlagPath(orderData.code);
        const flagElement = flagPath 
            ? `<img src="${flagPath}" alt="${orderData.name} flag" class="checkout-flag">`
            : '<span class="checkout-flag">🏳️</span>';
        
        headerElement.innerHTML = `
            <span class="checkout-country-name">${orderData.name}</span>
            ${flagElement}
        `;
    } else if (orderData.type === 'region') {
        const iconFileName = regionIconMap[orderData.name] || 'Afrrica.png';
        const iconPath = `Region/${iconFileName}`;
        
        headerElement.innerHTML = `
            <span class="checkout-country-name">${orderData.name}</span>
            <img src="${iconPath}" alt="${orderData.name} icon" class="checkout-region-icon">
        `;
    } else if (orderData.type === 'global') {
        headerElement.innerHTML = `
            <span class="checkout-country-name">Global</span>
            <div class="checkout-global-icon">🌍</div>
        `;
    }
    
    // Setup plan details
    const plans = orderData.planType === 'unlimited' ? unlimitedPlans : standardPlans;
    
    // Если планы еще не загружены, используем fallback
    if (plans.length === 0) {
        planDetailsElement.innerHTML = `
            <span class="checkout-plan-amount">Loading...</span>
            <span class="checkout-plan-duration">Loading...</span>
        `;
        originalPrice = '$ 9.99';
        return; // Выходим, updateOrderDetailsWithRealPlans обновит позже
    }
    
    // Улучшенная логика поиска плана:
    // 1. Сначала ищем по точному совпадению ID или bundle_name
    // 2. Если не найдено и это unlimited план, пытаемся найти по индексу (unlimited1 = index 0, unlimited2 = index 1, etc.)
    let selectedPlan = plans.find(p => p.id === orderData.planId || p.bundle_name === orderData.planId);
    
    // Если план не найден и это unlimited план с ID вида unlimitedN, пытаемся найти по индексу
    if (!selectedPlan && orderData.planType === 'unlimited' && orderData.planId) {
        const idMatch = orderData.planId.match(/unlimited(\d+)/);
        if (idMatch) {
            const index = parseInt(idMatch[1]) - 1; // unlimited1 = index 0, unlimited2 = index 1, etc.
            if (index >= 0 && index < plans.length) {
                selectedPlan = plans[index];
            }
        }
    }
    
    // Если все еще не найден, используем первый план как fallback
    if (!selectedPlan) {
        selectedPlan = plans[0];
    }
    
    if (selectedPlan) {
        planDetailsElement.innerHTML = `
            <span class="checkout-plan-amount">${selectedPlan.data}</span>
            <span class="checkout-plan-duration">${selectedPlan.duration}</span>
        `;
        
        // Store original price (используем реальную цену из API или fallback)
        // Проверяем priceValue (финальная цена) или price (себестоимость)
        let priceToUse = selectedPlan.priceValue || selectedPlan.price || '$ 9.99';
        
        // Убеждаемся, что цена в правильном формате
        if (typeof priceToUse === 'number') {
            originalPrice = `$ ${priceToUse.toFixed(2)}`;
        } else if (typeof priceToUse === 'string') {
            // Если уже в формате "$ 9.99", используем как есть
            if (priceToUse.startsWith('$')) {
                originalPrice = priceToUse;
            } else {
                // Если просто число, добавляем "$ "
                originalPrice = `$ ${priceToUse}`;
            }
        } else {
            originalPrice = '$ 9.99';
        }
        
        console.log('Setup order details with plan:', {
            planId: orderData.planId,
            selectedPlan: selectedPlan,
            price: originalPrice
        });
    } else {
        // Fallback если план не найден
        planDetailsElement.innerHTML = `
            <span class="checkout-plan-amount">Loading...</span>
            <span class="checkout-plan-duration">Loading...</span>
        `;
        originalPrice = '$ 9.99';
    }
    
    // Update total price
    updateTotalPrice();
}

/**
 * Обновление деталей заказа с реальными планами из API
 */
function updateOrderDetailsWithRealPlans() {
    const planDetailsElement = document.getElementById('checkoutPlanDetails');
    const totalPriceElement = document.getElementById('checkoutTotalPrice');
    
    if (!planDetailsElement || !totalPriceElement) {
        return;
    }
    
    // Находим выбранный план
    const plans = orderData.planType === 'unlimited' ? unlimitedPlans : standardPlans;
    
    // Улучшенная логика поиска плана:
    // 1. Сначала ищем по точному совпадению ID или bundle_name
    // 2. Если не найдено и это unlimited план, пытаемся найти по индексу (unlimited1 = index 0, unlimited2 = index 1, etc.)
    let selectedPlan = plans.find(p => p.id === orderData.planId || p.bundle_name === orderData.planId);
    
    // Если план не найден и это unlimited план с ID вида unlimitedN, пытаемся найти по индексу
    if (!selectedPlan && orderData.planType === 'unlimited' && orderData.planId) {
        const idMatch = orderData.planId.match(/unlimited(\d+)/);
        if (idMatch) {
            const index = parseInt(idMatch[1]) - 1; // unlimited1 = index 0, unlimited2 = index 1, etc.
            if (index >= 0 && index < plans.length) {
                selectedPlan = plans[index];
            }
        }
    }
    
    // Если все еще не найден, используем первый план как fallback
    if (!selectedPlan) {
        selectedPlan = plans[0];
    }
    
    if (selectedPlan) {
        // Обновляем детали плана
        planDetailsElement.innerHTML = `
            <span class="checkout-plan-amount">${selectedPlan.data}</span>
            <span class="checkout-plan-duration">${selectedPlan.duration}</span>
        `;
        
        // Обновляем цену
        originalPrice = selectedPlan.price || '$ 9.99';
        updateTotalPrice();
        
        console.log('Order details updated with real plan:', {
            plan: selectedPlan.data,
            duration: selectedPlan.duration,
            price: selectedPlan.price
        });
    }
}

// Update total price display with discount if applicable
function updateTotalPrice() {
    const totalPriceElement = document.getElementById('checkoutTotalPrice');
    
    // Извлекаем базовую цену
    let basePrice = 0;
    const priceMatch = originalPrice.match(/\$?\s*([\d.]+)/);
    if (priceMatch) {
        basePrice = parseFloat(priceMatch[1]);
    }
    
    // Применяем наценку способа оплаты, если выбрана
    if (publicSettings && selectedPaymentMethod && basePrice > 0) {
        const paymentMethodKey = selectedPaymentMethod === 'stars' ? 'telegramStars' :
                                 selectedPaymentMethod === 'cryptomus' ? 'crypto' :
                                 selectedPaymentMethod === 'stripe' ? 'bankCard' : null;
        
        if (paymentMethodKey && publicSettings.paymentMethods[paymentMethodKey]) {
            const paymentMethod = publicSettings.paymentMethods[paymentMethodKey];
            if (paymentMethod.enabled && paymentMethod.markupMultiplier) {
                basePrice = basePrice * paymentMethod.markupMultiplier;
            }
        }
    }
    
    // Применяем промокод, если активен
    if (isPromoApplied && (discountPercent > 0 || discountAmount > 0)) {
        let discountedPrice = basePrice;
        
        if (discountPercent > 0) {
            // Процентная скидка
            discountedPrice = basePrice * (1 - discountPercent / 100);
        } else if (discountAmount > 0) {
            // Фиксированная скидка
            discountedPrice = Math.max(0, basePrice - discountAmount);
        }
        
        const originalPriceDisplay = basePrice > 0 ? `$ ${basePrice.toFixed(2)}` : originalPrice;
        const newPrice = `$ ${discountedPrice.toFixed(2)}`;
        
        totalPriceElement.innerHTML = `
            <span class="checkout-total-price-old">${originalPriceDisplay}</span>
            <span class="checkout-total-price-new">${newPrice}</span>
        `;
    } else {
        // Без промокода, но с наценкой способа оплаты
        if (basePrice > 0) {
            totalPriceElement.textContent = `$ ${basePrice.toFixed(2)}`;
        } else {
            totalPriceElement.textContent = originalPrice;
        }
    }
}

// Setup promo code button
async function setupPromoCode() {
    const promoBtn = document.getElementById('promoBtn');
    const promoInput = document.getElementById('promoInput');
    const promoError = document.getElementById('promoError');
    const promoSuccess = document.getElementById('promoSuccess');
    
    if (promoBtn && promoInput && promoError && promoSuccess) {
        promoBtn.addEventListener('click', async () => {
            // Убираем фокус с поля ввода и сразу показываем элементы обратно
            promoInput.blur();
            showBottomElements(); // Показываем элементы сразу при нажатии на OK
            
            const promoCode = promoInput.value.trim().toUpperCase();
            
            if (!promoCode) {
                promoError.style.display = 'none';
                promoSuccess.style.display = 'none';
                return;
            }
            
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            
            // Получаем текущую цену для валидации промокода
            let currentPrice = 0;
            const priceMatch = originalPrice.match(/\$?\s*([\d.]+)/);
            if (priceMatch) {
                currentPrice = parseFloat(priceMatch[1]);
            }
            
            // Применяем наценку способа оплаты, если выбрана
            if (publicSettings && selectedPaymentMethod && currentPrice > 0) {
                const paymentMethodKey = selectedPaymentMethod === 'stars' ? 'telegramStars' :
                                         selectedPaymentMethod === 'cryptomus' ? 'crypto' :
                                         selectedPaymentMethod === 'stripe' ? 'bankCard' : null;
                
                if (paymentMethodKey && publicSettings.paymentMethods[paymentMethodKey]) {
                    const paymentMethod = publicSettings.paymentMethods[paymentMethodKey];
                    if (paymentMethod.enabled && paymentMethod.markupMultiplier) {
                        currentPrice = currentPrice * paymentMethod.markupMultiplier;
                    }
                }
            }
            
            // Валидируем промокод через API
            try {
                console.log('[Promocode] Validating:', { code: promoCode, amount: currentPrice });
                const response = await fetch('/api/promocode/validate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code: promoCode,
                        amount: currentPrice
                    })
                });
                
                const data = await response.json();
                console.log('[Promocode] API Response:', data);
                
                if (data.success && data.discount) {
                    // Valid promo code
                    isPromoApplied = true;
                    appliedPromocode = data.promocode;
                    
                    // Сохраняем информацию о скидке
                    if (data.promocode.type === 'percent') {
                        discountPercent = data.promocode.discount;
                        discountAmount = data.discount.amount;
                    } else {
                        discountPercent = 0;
                        discountAmount = data.discount.amount;
                    }
                    
                    promoError.style.display = 'none';
                    promoSuccess.style.display = 'block';
                    promoInput.style.borderColor = 'transparent';
                    
                    // Update price with discount
                    updateTotalPrice();
                    
                    // Показываем элементы обратно после успешной валидации
                    showBottomElements();
                    
                    if (tg) {
                        tg.HapticFeedback.notificationOccurred('success');
                    }
                } else {
                    // Invalid promo code
                    console.log('[Promocode] Validation failed:', data);
                    isPromoApplied = false;
                    discountPercent = 0;
                    discountAmount = 0;
                    appliedPromocode = null;
                    
                    promoError.textContent = data.error || 'Промокод недействителен';
                    promoError.style.display = 'block';
                    promoSuccess.style.display = 'none';
                    promoInput.style.borderColor = '#FF3B30';
                    
                    // Reset price to original
                    updateTotalPrice();
                    
                    // Показываем элементы обратно после ошибки
                    showBottomElements();
                    
                    if (tg) {
                        tg.HapticFeedback.notificationOccurred('error');
                    }
                }
            } catch (error) {
                console.error('Error validating promocode:', error);
                isPromoApplied = false;
                discountPercent = 0;
                discountAmount = 0;
                appliedPromocode = null;
                
                promoError.textContent = 'Ошибка проверки промокода';
                promoError.style.display = 'block';
                promoSuccess.style.display = 'none';
                promoInput.style.borderColor = '#FF3B30';
                
                updateTotalPrice();
                
                // Показываем элементы обратно после ошибки
                showBottomElements();
                
                if (tg) {
                    tg.HapticFeedback.notificationOccurred('error');
                }
            }
        });
        
        // Hide messages when user starts typing
        promoInput.addEventListener('input', () => {
            if (promoError.style.display === 'block' || promoSuccess.style.display === 'block') {
                promoError.style.display = 'none';
                promoSuccess.style.display = 'none';
                promoInput.style.borderColor = 'transparent';
                
                // Reset discount if user changes input
                if (isPromoApplied) {
                    isPromoApplied = false;
                    discountPercent = 0;
                    discountAmount = 0;
                    appliedPromocode = null;
                    updateTotalPrice();
                }
            }
        });
        
        // Получаем элементы, которые могут перекрывать поле промокода
        const purchaseButtonContainer = document.querySelector('.bottom-button-container');
        const bottomNav = document.querySelector('.bottom-nav');
        
        // Флаг для предотвращения множественных прокруток одновременно
        let scrollTimeout = null;
        let lastScrollTime = 0;
        const SCROLL_DEBOUNCE = 300; // Минимальный интервал между прокрутками (мс)
        
        // Auto-scroll to promo input when focused (to keep it visible above keyboard)
        const scrollToPromoInput = () => {
            const now = Date.now();
            
            // Получаем позицию поля промокода для проверки видимости
            const promoCard = promoInput.closest('.promo-card');
            const targetElement = promoCard || promoInput;
            
            if (!targetElement) {
                return;
            }
            
            // Проверяем, видно ли поле в видимой области
            const rect = targetElement.getBoundingClientRect();
            const visualViewport = window.visualViewport;
            const viewportHeight = visualViewport ? visualViewport.height : window.innerHeight;
            const estimatedKeyboardHeight = Math.min(viewportHeight * 0.5, 350);
            const visibleTop = 0;
            const visibleBottom = viewportHeight - estimatedKeyboardHeight;
            
            // Если поле видно в видимой области, не прокручиваем (debounce)
            const isVisible = rect.top >= visibleTop && rect.top <= visibleBottom;
            
            // Debounce: предотвращаем слишком частые прокрутки, НО только если поле уже видно
            if (isVisible && now - lastScrollTime < SCROLL_DEBOUNCE) {
                return;
            }
            
            // Если поле не видно или прошло достаточно времени, прокручиваем
            lastScrollTime = now;
            
            // Очищаем предыдущий таймаут, если есть
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            
            // Используем уже вычисленные значения (visualViewport, viewportHeight, estimatedKeyboardHeight, rect)
            const elementTop = rect.top + window.pageYOffset;
            const elementHeight = rect.height;
            
            // Вычисляем позицию для прокрутки
            // Поле должно быть в верхней части видимой области (с учетом клавиатуры)
            const scrollOffset = Math.max(150, estimatedKeyboardHeight * 0.3); // Отступ сверху
            const targetScroll = elementTop - scrollOffset;
            
            // Используем scrollIntoView для более надежной прокрутки в Telegram WebView
            // Это более надежный способ, который учитывает видимую область
            if (targetElement.scrollIntoView) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                    inline: 'nearest'
                });
                
                // Дополнительная корректировка через scrollTo для точности
                scrollTimeout = setTimeout(() => {
                    window.scrollTo({
                        top: Math.max(0, targetScroll),
                        behavior: 'smooth'
                    });
                }, 100);
            } else {
                // Fallback для старых браузеров
                window.scrollTo({
                    top: Math.max(0, targetScroll),
                    behavior: 'smooth'
                });
            }
        };
        
        // Временно скрываем кнопку Purchase и нижнее меню при фокусе на поле промокода
        const hideBottomElements = () => {
            if (purchaseButtonContainer) {
                purchaseButtonContainer.style.display = 'none';
            }
            if (bottomNav) {
                bottomNav.style.display = 'none';
            }
        };
        
        const showBottomElements = () => {
            if (purchaseButtonContainer) {
                purchaseButtonContainer.style.display = '';
            }
            if (bottomNav) {
                bottomNav.style.display = '';
            }
        };
        
        // Обработчик focus - основное событие
        promoInput.addEventListener('focus', () => {
            // Скрываем элементы снизу СРАЗУ
            hideBottomElements();
            
            // Прокручиваем с несколькими попытками для учета появления клавиатуры
            // Первая попытка - сразу (на случай, если клавиатура уже появилась)
            scrollToPromoInput();
            
            // Вторая попытка - через 200ms (когда клавиатура начинает появляться)
            setTimeout(() => {
                scrollToPromoInput();
            }, 200);
            
            // Третья попытка - через 400ms (когда клавиатура уже появилась)
            setTimeout(() => {
                scrollToPromoInput();
            }, 400);
        });
        
        // Показываем элементы обратно при потере фокуса
        promoInput.addEventListener('blur', () => {
            // Сбрасываем lastScrollTime при потере фокуса, чтобы следующее фокусирование работало
            lastScrollTime = 0;
            
            // Небольшая задержка, чтобы пользователь мог нажать кнопку OK
            setTimeout(() => {
                // Проверяем, что фокус действительно ушел (не перешел на другую кнопку)
                if (document.activeElement !== promoInput && 
                    document.activeElement !== promoBtn &&
                    document.activeElement !== purchaseButtonContainer?.querySelector('#purchaseBtn')) {
                    showBottomElements();
                }
            }, 200);
        });
        
        // Также обрабатываем событие touchstart для мобильных устройств (предварительная прокрутка)
        promoInput.addEventListener('touchstart', () => {
            // Скрываем элементы сразу при касании
            hideBottomElements();
            // Прокручиваем сразу (до появления клавиатуры)
            requestAnimationFrame(() => {
                scrollToPromoInput();
            });
        }, { passive: true });
        
        // Обработчик изменения размера viewport (когда клавиатура появляется/исчезает)
        let resizeTimeout;
        const handleViewportResize = () => {
            // Если поле в фокусе, прокручиваем снова
            if (document.activeElement === promoInput) {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    scrollToPromoInput();
                }, 150); // Debounce для resize
            }
        };
        
        // Обрабатываем visualViewport resize (лучше работает в Telegram WebView)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportResize);
        }
        
        // Также обрабатываем обычный resize как fallback
        window.addEventListener('resize', handleViewportResize);
    }
}

// Setup purchase button
function setupPurchaseButton() {
    const purchaseBtn = document.getElementById('purchaseBtn');
    
    if (!purchaseBtn) {
        console.error('❌ Purchase button not found in DOM');
        return;
    }
    
    // Убеждаемся, что кнопка активна
    purchaseBtn.disabled = false;
    purchaseBtn.style.opacity = '1';
    purchaseBtn.style.cursor = 'pointer';
    
    purchaseBtn.addEventListener('click', async () => {
        const auth = window.telegramAuth;
        
        // Проверка авторизации
        if (!auth || !auth.isAuthenticated()) {
            alert('Пожалуйста, авторизуйтесь через Telegram для оформления заказа');
            if (tg) {
                tg.HapticFeedback.notificationOccurred('error');
            }
            return;
        }
        
        // Проверяем выбранный метод оплаты
        if (selectedPaymentMethod === 'stars') {
            // Оплата через Telegram Stars
            await initiateStarsPayment(auth);
            return;
        }
        
        // Для других методов оплаты (Bank Cards, Crypto Payments) - показываем сообщение
        if (selectedPaymentMethod && selectedPaymentMethod !== 'stars') {
            if (tg) {
                tg.showAlert(`${PAYMENT_METHODS[selectedPaymentMethod]} payment will be available soon.`);
            } else {
                alert(`${PAYMENT_METHODS[selectedPaymentMethod]} payment will be available soon.`);
            }
            return;
        }
        
        // Если метод оплаты не выбран, просим выбрать метод
        if (!selectedPaymentMethod) {
            if (tg) {
                tg.HapticFeedback.notificationOccurred('error');
                tg.showAlert('Please select a payment method first.');
            } else {
                alert('Please select a payment method first.');
            }
            return;
        }
        
        // Если метод оплаты не выбран, используем стандартный процесс (legacy)
        if (tg) {
            tg.HapticFeedback.impactOccurred('medium');
        }
        
        // Показываем индикатор загрузки
        const purchaseBtn = document.getElementById('purchaseBtn');
        const originalText = purchaseBtn.textContent;
        purchaseBtn.textContent = 'Validating...';
        purchaseBtn.disabled = true;
        
        try {
            // 🔐 ВАЖНО: Серверная валидация данных Telegram (signature/hash)
            const validation = await auth.validateOnServer('/api/validate-telegram');
            
            if (!validation.valid) {
                throw new Error(validation.error || 'Validation failed');
            }
            
            console.log('✅ Telegram data validated:', validation.method);
            
            // Создание заказа с данными пользователя (после валидации)
            const orderWithUser = {
                ...orderData,
                telegram_user_id: auth.getUserId(),
                telegram_username: auth.getUsername(),
                user_name: auth.getUserName(),
                validation_method: validation.method,
                created_at: new Date().toISOString()
            };
            
            console.log('Purchase order with validated user data:', orderWithUser);
            
            // Восстанавливаем кнопку
            purchaseBtn.textContent = originalText;
            purchaseBtn.disabled = false;
            
            // Подтверждение покупки
            if (tg && tg.showConfirm) {
                tg.showConfirm('Confirm purchase?', async (confirmed) => {
                    if (confirmed) {
                        await processPurchase(orderWithUser, auth, tg);
                    }
                });
            } else {
                // Если showConfirm недоступен, сразу обрабатываем покупку
                await processPurchase(orderWithUser, auth, tg);
            }
            
        } catch (error) {
            console.error('❌ Validation error:', error);
            
            // Восстанавливаем кнопку
            purchaseBtn.textContent = originalText;
            purchaseBtn.disabled = false;
            
            if (tg) {
                tg.HapticFeedback.notificationOccurred('error');
                tg.showAlert('Ошибка проверки данных: ' + error.message);
            } else {
                alert('Ошибка проверки данных: ' + error.message);
            }
        }
    });
}

/**
 * Получить и показать assignments (QR код)
 */
async function getAndShowAssignments(orderReference, tg) {
    try {
        const response = await fetch(`/api/esimgo/assignments?reference=${orderReference}`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to get assignments');
        }
        
        showOrderSuccess({ assignments: data.data, orderReference }, tg);
    } catch (error) {
        console.error('Failed to get assignments:', error);
        throw error;
    }
}

/**
 * Показать успешный заказ с QR кодом
 */
function showOrderSuccess(orderData, tg) {
    // TODO: Создать страницу или модальное окно для показа QR кода
    // Пока просто перенаправляем на страницу успеха
    const assignments = orderData.assignments;
    
    if (assignments && assignments.iccid) {
        // Сохраняем в localStorage для отображения в my-esims
        const orderInfo = {
            iccid: assignments.iccid,
            matchingId: assignments.matchingId,
            smdpAddress: assignments.smdpAddress,
            orderReference: orderData.orderReference,
            createdAt: new Date().toISOString()
        };
        
        // Получаем существующие заказы
        const existingOrders = JSON.parse(localStorage.getItem('esim_orders') || '[]');
        existingOrders.push(orderInfo);
        localStorage.setItem('esim_orders', JSON.stringify(existingOrders));
        
        // Перенаправляем на страницу успеха или my-esims
        if (tg) {
            tg.showAlert('Order successful! Check "My eSIMs" for QR code.');
            setTimeout(() => {
                window.location.href = 'my-esims.html';
            }, 2000);
        } else {
            alert('Order successful! Check "My eSIMs" for QR code.');
            window.location.href = 'my-esims.html';
        }
    }
}

// Region icon file mapping
const regionIconMap = {
    'Africa': 'Afrrica.png',
    'Asia': 'Asia.png',
    'Europe': 'Europe.png',
    'Latin America': 'Latin America.png',
    'North America': 'North America.png',
    'Balkanas': 'Balkanas.png',
    'Central Eurasia': 'Central Eurasia.png',
    'Oceania': 'Oceania.png'
};

// Version for cache busting - increment when flags are updated
const FLAG_VERSION = 'v7'; // Updated: force refresh for missing flags (AX, BM, etc.)

// Function to get flag image URL from local flags folder
function getFlagPath(countryCode) {
    if (!countryCode) {
        return null;
    }
    // Файлы в верхнем регистре: AF.svg, TH.svg и т.д.
    let code = countryCode.toUpperCase();
    
    // Специальная обработка для файлов с пробелами или специальными символами
    const specialFlagFiles = {
        'CYP': 'CYP;CY .svg',  // Northern Cyprus файл с пробелом
        'US-HI': 'US-HI .svg'  // Hawaii файл с пробелом
    };
    
    // Если есть специальный файл, используем его
    // Кодируем пробелы и специальные символы в URL
    if (specialFlagFiles[code]) {
        const fileName = specialFlagFiles[code];
        const encodedFileName = encodeURIComponent(fileName);
        return `/flags/${encodedFileName}?${FLAG_VERSION}`;
    }
    
    return `/flags/${code}.svg?${FLAG_VERSION}`;
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Telegram Auth - проверка авторизации перед оформлением заказа
    const auth = window.telegramAuth;
    if (auth && auth.isAuthenticated()) {
        const userId = auth.getUserId();
        console.log('Checkout - User authenticated:', userId);
        window.currentUserId = userId;
    } else {
        console.warn('Checkout - User not authenticated');
        // Можно показать предупреждение или перенаправить
    }
    
    // Загружаем реальные планы для checkout
    console.log('🔵 DOMContentLoaded - orderData:', orderData);
    const plansLoaded = await loadPlansForCheckout();
    
    // Загружаем публичные настройки (наценки на способы оплаты)
    await loadPublicSettings();
    
    console.log('🔵 Plans loaded status:', plansLoaded, {
        standardCount: standardPlans.length,
        unlimitedCount: unlimitedPlans.length,
        firstPlan: standardPlans[0] || unlimitedPlans[0]
    });
    
    setupOrderDetails();
    setupPromoCode();
    setupPaymentMethodUI();
    setupPurchaseButton();
    setupNavigation();
    setupBackButton();
    
    // Убеждаемся, что нижнее меню всегда видно
    ensureBottomNavVisible();
    setTimeout(ensureBottomNavVisible, 100);
    
    // Если планы загрузились, обновляем отображение
    if (plansLoaded && (standardPlans.length > 0 || unlimitedPlans.length > 0)) {
        updateOrderDetailsWithRealPlans();
    }
});

// Setup back button to return to plans page
function setupBackButton() {
    if (!tg || !tg.BackButton) {
        return;
    }
    
    tg.BackButton.show();
    tg.BackButton.onClick(() => {
        if (tg && tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
        
        // Возвращаемся на соответствующую страницу со списком тарифов
        if (orderData.type === 'country') {
            // Local: возвращаемся на plans.html с параметрами страны
            const params = new URLSearchParams({
                country: orderData.name,
                code: orderData.code
            });
            window.location.href = `plans.html?${params.toString()}`;
        } else if (orderData.type === 'region') {
            // Region: возвращаемся на region-plans.html с параметром региона
            const params = new URLSearchParams({
                region: orderData.name
            });
            window.location.href = `region-plans.html?${params.toString()}`;
        } else if (orderData.type === 'global') {
            // Global: возвращаемся на global-plans.html
            window.location.href = 'global-plans.html';
        } else {
            // Fallback: возвращаемся на главную
            window.location.href = 'index.html?segment=local';
        }
    });
}

// Ensure bottom navigation is always visible
function ensureBottomNavVisible() {
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        bottomNav.style.display = 'flex';
        bottomNav.style.visibility = 'visible';
        bottomNav.style.opacity = '1';
        bottomNav.style.position = 'fixed';
        bottomNav.style.bottom = '0';
        bottomNav.style.zIndex = '10000'; // Нижнее меню должно быть видно
    }
}

// Setup bottom navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const label = item.querySelector('.nav-label').textContent;
            handleNavigationClick(label);
        });
    });
}

// Handle navigation click
function handleNavigationClick(section) {
    if (tg) {
        tg.HapticFeedback.impactOccurred('light');
    }
    
    const navigate = window.optimizedNavigate || ((url) => { window.location.href = url; });
    
    if (section === 'Account') {
        navigate('account.html');
    } else if (section === 'Buy eSIM') {
        navigate('index.html');
    } else if (section === 'Help') {
        navigate('help.html');
    }
}

// Setup order details
function setupOrderDetails() {
    const headerElement = document.getElementById('checkoutHeader');
    const planDetailsElement = document.getElementById('checkoutPlanDetails');
    const totalPriceElement = document.getElementById('checkoutTotalPrice');
    
    // Setup location info in header
    if (orderData.type === 'country') {
        const flagPath = getFlagPath(orderData.code);
        const flagElement = flagPath 
            ? `<img src="${flagPath}" alt="${orderData.name} flag" class="checkout-flag">`
            : '<span class="checkout-flag">🏳️</span>';
        
        headerElement.innerHTML = `
            <span class="checkout-country-name">${orderData.name}</span>
            ${flagElement}
        `;
    } else if (orderData.type === 'region') {
        const iconFileName = regionIconMap[orderData.name] || 'Afrrica.png';
        const iconPath = `Region/${iconFileName}`;
        
        headerElement.innerHTML = `
            <span class="checkout-country-name">${orderData.name}</span>
            <img src="${iconPath}" alt="${orderData.name} icon" class="checkout-region-icon">
        `;
    } else if (orderData.type === 'global') {
        headerElement.innerHTML = `
            <span class="checkout-country-name">Global</span>
            <div class="checkout-global-icon">🌍</div>
        `;
    }
    
    // Setup plan details
    const plans = orderData.planType === 'unlimited' ? unlimitedPlans : standardPlans;
    
    // Если планы еще не загружены, используем fallback
    if (plans.length === 0) {
        planDetailsElement.innerHTML = `
            <span class="checkout-plan-amount">Loading...</span>
            <span class="checkout-plan-duration">Loading...</span>
        `;
        originalPrice = '$ 9.99';
        return; // Выходим, updateOrderDetailsWithRealPlans обновит позже
    }
    
    // Улучшенная логика поиска плана:
    // 1. Сначала ищем по точному совпадению ID или bundle_name
    // 2. Если не найдено и это unlimited план, пытаемся найти по индексу (unlimited1 = index 0, unlimited2 = index 1, etc.)
    let selectedPlan = plans.find(p => p.id === orderData.planId || p.bundle_name === orderData.planId);
    
    // Если план не найден и это unlimited план с ID вида unlimitedN, пытаемся найти по индексу
    if (!selectedPlan && orderData.planType === 'unlimited' && orderData.planId) {
        const idMatch = orderData.planId.match(/unlimited(\d+)/);
        if (idMatch) {
            const index = parseInt(idMatch[1]) - 1; // unlimited1 = index 0, unlimited2 = index 1, etc.
            if (index >= 0 && index < plans.length) {
                selectedPlan = plans[index];
            }
        }
    }
    
    // Если все еще не найден, используем первый план как fallback
    if (!selectedPlan) {
        selectedPlan = plans[0];
    }
    
    if (selectedPlan) {
        planDetailsElement.innerHTML = `
            <span class="checkout-plan-amount">${selectedPlan.data}</span>
            <span class="checkout-plan-duration">${selectedPlan.duration}</span>
        `;
        
        // Store original price (используем реальную цену из API или fallback)
        // Проверяем priceValue (финальная цена) или price (себестоимость)
        let priceToUse = selectedPlan.priceValue || selectedPlan.price || '$ 9.99';
        
        // Убеждаемся, что цена в правильном формате
        if (typeof priceToUse === 'number') {
            originalPrice = `$ ${priceToUse.toFixed(2)}`;
        } else if (typeof priceToUse === 'string') {
            // Если уже в формате "$ 9.99", используем как есть
            if (priceToUse.startsWith('$')) {
                originalPrice = priceToUse;
            } else {
                // Если просто число, добавляем "$ "
                originalPrice = `$ ${priceToUse}`;
            }
        } else {
            originalPrice = '$ 9.99';
        }
        
        console.log('Setup order details with plan:', {
            planId: orderData.planId,
            selectedPlan: selectedPlan,
            price: originalPrice
        });
    } else {
        // Fallback если план не найден
        planDetailsElement.innerHTML = `
            <span class="checkout-plan-amount">Loading...</span>
            <span class="checkout-plan-duration">Loading...</span>
        `;
        originalPrice = '$ 9.99';
    }
    
    // Update total price
    updateTotalPrice();
}

/**
 * Обновление деталей заказа с реальными планами из API
 */
function updateOrderDetailsWithRealPlans() {
    const planDetailsElement = document.getElementById('checkoutPlanDetails');
    const totalPriceElement = document.getElementById('checkoutTotalPrice');
    
    if (!planDetailsElement || !totalPriceElement) {
        return;
    }
    
    // Находим выбранный план
    const plans = orderData.planType === 'unlimited' ? unlimitedPlans : standardPlans;
    
    // Улучшенная логика поиска плана:
    // 1. Сначала ищем по точному совпадению ID или bundle_name
    // 2. Если не найдено и это unlimited план, пытаемся найти по индексу (unlimited1 = index 0, unlimited2 = index 1, etc.)
    let selectedPlan = plans.find(p => p.id === orderData.planId || p.bundle_name === orderData.planId);
    
    // Если план не найден и это unlimited план с ID вида unlimitedN, пытаемся найти по индексу
    if (!selectedPlan && orderData.planType === 'unlimited' && orderData.planId) {
        const idMatch = orderData.planId.match(/unlimited(\d+)/);
        if (idMatch) {
            const index = parseInt(idMatch[1]) - 1; // unlimited1 = index 0, unlimited2 = index 1, etc.
            if (index >= 0 && index < plans.length) {
                selectedPlan = plans[index];
            }
        }
    }
    
    // Если все еще не найден, используем первый план как fallback
    if (!selectedPlan) {
        selectedPlan = plans[0];
    }
    
    if (selectedPlan) {
        // Обновляем детали плана
        planDetailsElement.innerHTML = `
            <span class="checkout-plan-amount">${selectedPlan.data}</span>
            <span class="checkout-plan-duration">${selectedPlan.duration}</span>
        `;
        
        // Обновляем цену
        originalPrice = selectedPlan.price || '$ 9.99';
        updateTotalPrice();
        
        console.log('Order details updated with real plan:', {
            plan: selectedPlan.data,
            duration: selectedPlan.duration,
            price: selectedPlan.price
        });
    }
}

// Update total price display with discount if applicable
function updateTotalPrice() {
    const totalPriceElement = document.getElementById('checkoutTotalPrice');
    
    // Извлекаем базовую цену
    let basePrice = 0;
    const priceMatch = originalPrice.match(/\$?\s*([\d.]+)/);
    if (priceMatch) {
        basePrice = parseFloat(priceMatch[1]);
    }
    
    // Применяем наценку способа оплаты, если выбрана
    if (publicSettings && selectedPaymentMethod && basePrice > 0) {
        const paymentMethodKey = selectedPaymentMethod === 'stars' ? 'telegramStars' :
                                 selectedPaymentMethod === 'cryptomus' ? 'crypto' :
                                 selectedPaymentMethod === 'stripe' ? 'bankCard' : null;
        
        if (paymentMethodKey && publicSettings.paymentMethods[paymentMethodKey]) {
            const paymentMethod = publicSettings.paymentMethods[paymentMethodKey];
            if (paymentMethod.enabled && paymentMethod.markupMultiplier) {
                basePrice = basePrice * paymentMethod.markupMultiplier;
            }
        }
    }
    
    // Применяем промокод, если активен
    if (isPromoApplied && (discountPercent > 0 || discountAmount > 0)) {
        let discountedPrice = basePrice;
        
        if (discountPercent > 0) {
            // Процентная скидка
            discountedPrice = basePrice * (1 - discountPercent / 100);
        } else if (discountAmount > 0) {
            // Фиксированная скидка
            discountedPrice = Math.max(0, basePrice - discountAmount);
        }
        
        const originalPriceDisplay = basePrice > 0 ? `$ ${basePrice.toFixed(2)}` : originalPrice;
        const newPrice = `$ ${discountedPrice.toFixed(2)}`;
        
        totalPriceElement.innerHTML = `
            <span class="checkout-total-price-old">${originalPriceDisplay}</span>
            <span class="checkout-total-price-new">${newPrice}</span>
        `;
    } else {
        // Без промокода, но с наценкой способа оплаты
        if (basePrice > 0) {
            totalPriceElement.textContent = `$ ${basePrice.toFixed(2)}`;
        } else {
            totalPriceElement.textContent = originalPrice;
        }
    }
}

// Setup promo code button
async function setupPromoCode() {
    const promoBtn = document.getElementById('promoBtn');
    const promoInput = document.getElementById('promoInput');
    const promoError = document.getElementById('promoError');
    const promoSuccess = document.getElementById('promoSuccess');
    
    if (promoBtn && promoInput && promoError && promoSuccess) {
        promoBtn.addEventListener('click', async () => {
            // Убираем фокус с поля ввода и сразу показываем элементы обратно
            promoInput.blur();
            showBottomElements(); // Показываем элементы сразу при нажатии на OK
            
            const promoCode = promoInput.value.trim().toUpperCase();
            
            if (!promoCode) {
                promoError.style.display = 'none';
                promoSuccess.style.display = 'none';
                return;
            }
            
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            
            // Получаем текущую цену для валидации промокода
            let currentPrice = 0;
            const priceMatch = originalPrice.match(/\$?\s*([\d.]+)/);
            if (priceMatch) {
                currentPrice = parseFloat(priceMatch[1]);
            }
            
            // Применяем наценку способа оплаты, если выбрана
            if (publicSettings && selectedPaymentMethod && currentPrice > 0) {
                const paymentMethodKey = selectedPaymentMethod === 'stars' ? 'telegramStars' :
                                         selectedPaymentMethod === 'cryptomus' ? 'crypto' :
                                         selectedPaymentMethod === 'stripe' ? 'bankCard' : null;
                
                if (paymentMethodKey && publicSettings.paymentMethods[paymentMethodKey]) {
                    const paymentMethod = publicSettings.paymentMethods[paymentMethodKey];
                    if (paymentMethod.enabled && paymentMethod.markupMultiplier) {
                        currentPrice = currentPrice * paymentMethod.markupMultiplier;
                    }
                }
            }
            
            // Валидируем промокод через API
            try {
                console.log('[Promocode] Validating:', { code: promoCode, amount: currentPrice });
                const response = await fetch('/api/promocode/validate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code: promoCode,
                        amount: currentPrice
                    })
                });
                
                const data = await response.json();
                console.log('[Promocode] API Response:', data);
                
                if (data.success && data.discount) {
                    // Valid promo code
                    isPromoApplied = true;
                    appliedPromocode = data.promocode;
                    
                    // Сохраняем информацию о скидке
                    if (data.promocode.type === 'percent') {
                        discountPercent = data.promocode.discount;
                        discountAmount = data.discount.amount;
                    } else {
                        discountPercent = 0;
                        discountAmount = data.discount.amount;
                    }
                    
                    promoError.style.display = 'none';
                    promoSuccess.style.display = 'block';
                    promoInput.style.borderColor = 'transparent';
                    
                    // Update price with discount
                    updateTotalPrice();
                    
                    // Показываем элементы обратно после успешной валидации
                    showBottomElements();
                    
                    if (tg) {
                        tg.HapticFeedback.notificationOccurred('success');
                    }
                } else {
                    // Invalid promo code
                    console.log('[Promocode] Validation failed:', data);
                    isPromoApplied = false;
                    discountPercent = 0;
                    discountAmount = 0;
                    appliedPromocode = null;
                    
                    promoError.textContent = data.error || 'Промокод недействителен';
                    promoError.style.display = 'block';
                    promoSuccess.style.display = 'none';
                    promoInput.style.borderColor = '#FF3B30';
                    
                    // Reset price to original
                    updateTotalPrice();
                    
                    // Показываем элементы обратно после ошибки
                    showBottomElements();
                    
                    if (tg) {
                        tg.HapticFeedback.notificationOccurred('error');
                    }
                }
            } catch (error) {
                console.error('Error validating promocode:', error);
                isPromoApplied = false;
                discountPercent = 0;
                discountAmount = 0;
                appliedPromocode = null;
                
                promoError.textContent = 'Ошибка проверки промокода';
                promoError.style.display = 'block';
                promoSuccess.style.display = 'none';
                promoInput.style.borderColor = '#FF3B30';
                
                updateTotalPrice();
                
                // Показываем элементы обратно после ошибки
                showBottomElements();
                
                if (tg) {
                    tg.HapticFeedback.notificationOccurred('error');
                }
            }
        });
        
        // Hide messages when user starts typing
        promoInput.addEventListener('input', () => {
            if (promoError.style.display === 'block' || promoSuccess.style.display === 'block') {
                promoError.style.display = 'none';
                promoSuccess.style.display = 'none';
                promoInput.style.borderColor = 'transparent';
                
                // Reset discount if user changes input
                if (isPromoApplied) {
                    isPromoApplied = false;
                    discountPercent = 0;
                    discountAmount = 0;
                    appliedPromocode = null;
                    updateTotalPrice();
                }
            }
        });
        
        // Получаем элементы, которые могут перекрывать поле промокода
        const purchaseButtonContainer = document.querySelector('.bottom-button-container');
        const bottomNav = document.querySelector('.bottom-nav');
        
        // Флаг для предотвращения множественных прокруток одновременно
        let scrollTimeout = null;
        let lastScrollTime = 0;
        const SCROLL_DEBOUNCE = 300; // Минимальный интервал между прокрутками (мс)
        
        // Auto-scroll to promo input when focused (to keep it visible above keyboard)
        const scrollToPromoInput = () => {
            const now = Date.now();
            
            // Получаем позицию поля промокода для проверки видимости
            const promoCard = promoInput.closest('.promo-card');
            const targetElement = promoCard || promoInput;
            
            if (!targetElement) {
                return;
            }
            
            // Проверяем, видно ли поле в видимой области
            const rect = targetElement.getBoundingClientRect();
            const visualViewport = window.visualViewport;
            const viewportHeight = visualViewport ? visualViewport.height : window.innerHeight;
            const estimatedKeyboardHeight = Math.min(viewportHeight * 0.5, 350);
            const visibleTop = 0;
            const visibleBottom = viewportHeight - estimatedKeyboardHeight;
            
            // Если поле видно в видимой области, не прокручиваем (debounce)
            const isVisible = rect.top >= visibleTop && rect.top <= visibleBottom;
            
            // Debounce: предотвращаем слишком частые прокрутки, НО только если поле уже видно
            if (isVisible && now - lastScrollTime < SCROLL_DEBOUNCE) {
                return;
            }
            
            // Если поле не видно или прошло достаточно времени, прокручиваем
            lastScrollTime = now;
            
            // Очищаем предыдущий таймаут, если есть
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            
            // Используем уже вычисленные значения (visualViewport, viewportHeight, estimatedKeyboardHeight, rect)
            const elementTop = rect.top + window.pageYOffset;
            const elementHeight = rect.height;
            
            // Вычисляем позицию для прокрутки
            // Поле должно быть в верхней части видимой области (с учетом клавиатуры)
            const scrollOffset = Math.max(150, estimatedKeyboardHeight * 0.3); // Отступ сверху
            const targetScroll = elementTop - scrollOffset;
            
            // Используем scrollIntoView для более надежной прокрутки в Telegram WebView
            // Это более надежный способ, который учитывает видимую область
            if (targetElement.scrollIntoView) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                    inline: 'nearest'
                });
                
                // Дополнительная корректировка через scrollTo для точности
                scrollTimeout = setTimeout(() => {
                    window.scrollTo({
                        top: Math.max(0, targetScroll),
                        behavior: 'smooth'
                    });
                }, 100);
            } else {
                // Fallback для старых браузеров
                window.scrollTo({
                    top: Math.max(0, targetScroll),
                    behavior: 'smooth'
                });
            }
        };
        
        // Временно скрываем кнопку Purchase и нижнее меню при фокусе на поле промокода
        const hideBottomElements = () => {
            if (purchaseButtonContainer) {
                purchaseButtonContainer.style.display = 'none';
            }
            if (bottomNav) {
                bottomNav.style.display = 'none';
            }
        };
        
        const showBottomElements = () => {
            if (purchaseButtonContainer) {
                purchaseButtonContainer.style.display = '';
            }
            if (bottomNav) {
                bottomNav.style.display = '';
            }
        };
        
        // Обработчик focus - основное событие
        promoInput.addEventListener('focus', () => {
            // Скрываем элементы снизу СРАЗУ
            hideBottomElements();
            
            // Прокручиваем с несколькими попытками для учета появления клавиатуры
            // Первая попытка - сразу (на случай, если клавиатура уже появилась)
            scrollToPromoInput();
            
            // Вторая попытка - через 200ms (когда клавиатура начинает появляться)
            setTimeout(() => {
                scrollToPromoInput();
            }, 200);
            
            // Третья попытка - через 400ms (когда клавиатура уже появилась)
            setTimeout(() => {
                scrollToPromoInput();
            }, 400);
        });
        
        // Показываем элементы обратно при потере фокуса
        promoInput.addEventListener('blur', () => {
            // Сбрасываем lastScrollTime при потере фокуса, чтобы следующее фокусирование работало
            lastScrollTime = 0;
            
            // Небольшая задержка, чтобы пользователь мог нажать кнопку OK
            setTimeout(() => {
                // Проверяем, что фокус действительно ушел (не перешел на другую кнопку)
                if (document.activeElement !== promoInput && 
                    document.activeElement !== promoBtn &&
                    document.activeElement !== purchaseButtonContainer?.querySelector('#purchaseBtn')) {
                    showBottomElements();
                }
            }, 200);
        });
        
        // Также обрабатываем событие touchstart для мобильных устройств (предварительная прокрутка)
        promoInput.addEventListener('touchstart', () => {
            // Скрываем элементы сразу при касании
            hideBottomElements();
            // Прокручиваем сразу (до появления клавиатуры)
            requestAnimationFrame(() => {
                scrollToPromoInput();
            });
        }, { passive: true });
        
        // Обработчик изменения размера viewport (когда клавиатура появляется/исчезает)
        let resizeTimeout;
        const handleViewportResize = () => {
            // Если поле в фокусе, прокручиваем снова
            if (document.activeElement === promoInput) {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    scrollToPromoInput();
                }, 150); // Debounce для resize
            }
        };
        
        // Обрабатываем visualViewport resize (лучше работает в Telegram WebView)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportResize);
        }
        
        // Также обрабатываем обычный resize как fallback
        window.addEventListener('resize', handleViewportResize);
    }
}

// Setup purchase button
function setupPurchaseButton() {
    const purchaseBtn = document.getElementById('purchaseBtn');
    
    if (!purchaseBtn) {
        console.error('❌ Purchase button not found in DOM');
        return;
    }
    
    // Убеждаемся, что кнопка активна
    purchaseBtn.disabled = false;
    purchaseBtn.style.opacity = '1';
    purchaseBtn.style.cursor = 'pointer';
    
    purchaseBtn.addEventListener('click', async () => {
        const auth = window.telegramAuth;
        
        // Проверка авторизации
        if (!auth || !auth.isAuthenticated()) {
            alert('Пожалуйста, авторизуйтесь через Telegram для оформления заказа');
            if (tg) {
                tg.HapticFeedback.notificationOccurred('error');
            }
            return;
        }
        
        // Проверяем выбранный метод оплаты
        if (selectedPaymentMethod === 'stars') {
            // Оплата через Telegram Stars
            await initiateStarsPayment(auth);
            return;
        }
        
        // Для других методов оплаты (Bank Cards, Crypto Payments) - показываем сообщение
        if (selectedPaymentMethod && selectedPaymentMethod !== 'stars') {
            if (tg) {
                tg.showAlert(`${PAYMENT_METHODS[selectedPaymentMethod]} payment will be available soon.`);
            } else {
                alert(`${PAYMENT_METHODS[selectedPaymentMethod]} payment will be available soon.`);
            }
            return;
        }
        
        // Если метод оплаты не выбран, просим выбрать метод
        if (!selectedPaymentMethod) {
            if (tg) {
                tg.HapticFeedback.notificationOccurred('error');
                tg.showAlert('Please select a payment method first.');
            } else {
                alert('Please select a payment method first.');
            }
            return;
        }
        
        // Если метод оплаты не выбран, используем стандартный процесс (legacy)
        if (tg) {
            tg.HapticFeedback.impactOccurred('medium');
        }
        
        // Показываем индикатор загрузки
        const purchaseBtn = document.getElementById('purchaseBtn');
        const originalText = purchaseBtn.textContent;
        purchaseBtn.textContent = 'Validating...';
        purchaseBtn.disabled = true;
        
        try {
            // 🔐 ВАЖНО: Серверная валидация данных Telegram (signature/hash)
            const validation = await auth.validateOnServer('/api/validate-telegram');
            
            if (!validation.valid) {
                throw new Error(validation.error || 'Validation failed');
            }
            
            console.log('✅ Telegram data validated:', validation.method);
            
            // Создание заказа с данными пользователя (после валидации)
            const orderWithUser = {
                ...orderData,
                telegram_user_id: auth.getUserId(),
                telegram_username: auth.getUsername(),
                user_name: auth.getUserName(),
                validation_method: validation.method,
                created_at: new Date().toISOString()
            };
            
            console.log('Purchase order with validated user data:', orderWithUser);
            
            // Восстанавливаем кнопку
            purchaseBtn.textContent = originalText;
            purchaseBtn.disabled = false;
            
            // Подтверждение покупки
            if (tg && tg.showConfirm) {
                tg.showConfirm('Confirm purchase?', async (confirmed) => {
                    if (confirmed) {
                        await processPurchase(orderWithUser, auth, tg);
                    }
                });
            } else {
                // Если showConfirm недоступен, сразу обрабатываем покупку
                await processPurchase(orderWithUser, auth, tg);
            }
            
        } catch (error) {
            console.error('❌ Validation error:', error);
            
            // Восстанавливаем кнопку
            purchaseBtn.textContent = originalText;
            purchaseBtn.disabled = false;
            
            if (tg) {
                tg.HapticFeedback.notificationOccurred('error');
                tg.showAlert('Ошибка проверки данных: ' + error.message);
            } else {
                alert('Ошибка проверки данных: ' + error.message);
            }
        }
    });
}

