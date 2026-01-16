// Telegram Web App initialization
let tg = window.Telegram.WebApp;

/**
 * Показывает собственное модальное окно с сообщением (вместо tg.showAlert для контроля языка кнопки)
 */
function showCustomAlert(message) {
    // Создаем overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.4); z-index: 10000; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s ease-out;';
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.style.cssText = 'background-color: #FFFFFF; border-radius: 14px; padding: 0; max-width: 270px; width: calc(100% - 40px); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2); animation: slideUp 0.3s ease-out;';
    
    modal.innerHTML = `
        <div style="padding: 20px; text-align: center;">
            <div style="font-size: 17px; font-weight: 400; color: #000000; margin-bottom: 20px; line-height: 1.4;">${message}</div>
        </div>
        <div style="border-top: 0.5px solid #E5E5EA;">
            <button id="customAlertClose" style="width: 100%; padding: 16px; font-size: 17px; font-weight: 400; color: #007AFF; background: none; border: none; cursor: pointer; -webkit-tap-highlight-color: transparent;">Close</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Функция закрытия
    const close = () => {
        overlay.style.animation = 'fadeOut 0.2s ease-out';
        modal.style.animation = 'slideDown 0.2s ease-out';
        setTimeout(() => {
            overlay.remove();
        }, 200);
    };
    
    // Закрытие по клику на кнопку
    const closeBtn = modal.querySelector('#customAlertClose');
    closeBtn.addEventListener('click', close);
    
    // Закрытие по клику на overlay
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            close();
        }
    });
    
    // Добавляем стили для анимации (если их еще нет)
    if (!document.getElementById('customAlertStyles')) {
        const style = document.createElement('style');
        style.id = 'customAlertStyles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes slideDown {
                from { opacity: 1; transform: translateY(0) scale(1); }
                to { opacity: 0; transform: translateY(20px) scale(0.95); }
            }
        `;
        document.head.appendChild(style);
    }
}

// 🔧 Флаг режима разработки - деактивирует кнопку Purchase
const DEV_MODE = false; // Установите false для активации покупок
const ENABLE_STARS = true; // Включает оплату через Telegram Stars
const STARS_RATE_DISPLAY = parseFloat('100'); // Примерный курс Stars для отображения

// Initialize Telegram Web App
if (tg) {
    tg.ready();
    tg.expand();
    
    // Set theme colors
    tg.setHeaderColor('#FFFFFF');
    tg.setBackgroundColor('#F2F2F7');
    
    // Показываем кнопку "назад" в Telegram
    if (tg.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            tg.HapticFeedback.impactOccurred('light');
            window.history.back();
        });
    }
}

// Get order data from URL
const urlParams = new URLSearchParams(window.location.search);
// ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Более строгое извлечение параметров
const extendParam = urlParams.get('extend');
const iccidParam = urlParams.get('iccid');

const orderData = {
    type: urlParams.get('type') || 'country', // country, region, global
    name: urlParams.get('name') || '',
    code: urlParams.get('code') || '',
    planId: urlParams.get('plan') || '',
    planType: urlParams.get('planType') || 'standard',
    extend: extendParam === 'true', // Флаг для добавления трафика к существующей eSIM
    iccid: (iccidParam && iccidParam.trim() !== '') ? iccidParam.trim() : '' // ICCID существующей eSIM для extend (убираем пробелы)
};

// Детальное логирование при инициализации
console.log('[Checkout] 🔍 Initial orderData from URL:', {
    extend: orderData.extend,
    iccid: orderData.iccid,
    hasExtend: !!orderData.extend,
    hasIccid: !!orderData.iccid,
    extendValue: orderData.extend,
    iccidValue: orderData.iccid,
    fullUrl: window.location.href,
    urlParams: window.location.search,
    allUrlParams: Object.fromEntries(urlParams.entries())
});

// Логируем режим extend
if (orderData.extend && orderData.iccid) {
    console.log('[Checkout] 🔄 Extend mode: Adding traffic to existing eSIM', {
        iccid: orderData.iccid,
        type: orderData.type,
        name: orderData.name
    });
} else {
    console.warn('[Checkout] ⚠️ Extend mode NOT detected:', {
        extend: orderData.extend,
        iccid: orderData.iccid,
        reason: !orderData.extend ? 'extend not in URL or not "true"' : (!orderData.iccid ? 'iccid not in URL or empty' : 'unknown')
    });
}

// Plans data - загружаются динамически из API
let standardPlans = [];
let unlimitedPlans = [];

/**
 * Загрузка реальных планов из eSIM Go API
 * Поддерживает country, region и global типы
 */
async function loadPlansFromAPI(countryCode, regionName, orderType) {
    console.log('🔵 loadPlansFromAPI called:', { countryCode, regionName, orderType });
    
    try {
        let apiUrl;
        
        // Определяем правильный API endpoint в зависимости от типа заказа
        if (orderType === 'region' && regionName) {
            // Для region используем специальный endpoint
            const params = new URLSearchParams();
            params.append('region', regionName);
            apiUrl = `/api/esimgo/region-plans?${params.toString()}`;
            console.log('🔵 Fetching region plans from:', apiUrl);
        } else if (orderType === 'global') {
            // Для global используем category=global
            apiUrl = `/api/esimgo/plans?category=global`;
            console.log('🔵 Fetching global plans from:', apiUrl);
        } else if (countryCode) {
            // Для country используем стандартный endpoint с country параметром
            const params = new URLSearchParams();
            params.append('country', countryCode);
            apiUrl = `/api/esimgo/plans?${params.toString()}`;
            console.log('🔵 Fetching country plans from:', apiUrl);
        } else {
            console.warn('⚠️ No valid parameters for loading plans');
            return false;
        }
        
        const response = await fetch(apiUrl);
        console.log('🔵 Response status:', response.status, response.statusText);
        
        // Если ошибка, читаем текст для отладки
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error Response:', errorText);
            throw new Error(`API returned ${response.status}: ${errorText.substring(0, 100)}`);
        }
        
        const result = await response.json();
        console.log('🔵 API response:', result);
        
        if (result.success && result.data) {
            standardPlans = result.data.standard || [];
            unlimitedPlans = result.data.unlimited || [];
            
            // Добавляем ID для совместимости (если нет)
            standardPlans.forEach((plan, index) => {
                if (!plan.id) {
                    plan.id = `plan${index + 1}`;
                }
            });
            
            unlimitedPlans.forEach((plan, index) => {
                if (!plan.id) {
                    plan.id = `unlimited${index + 1}`;
                }
            });
            
            console.log('Plans loaded from API:', {
                type: orderType,
                standard: standardPlans.length,
                unlimited: unlimitedPlans.length,
                country: countryCode,
                region: regionName,
                sampleStandard: standardPlans[0] || null,
                sampleUnlimited: unlimitedPlans[0] || null
            });
            
            // Логируем первые планы для отладки
            if (standardPlans.length > 0) {
                console.log('First standard plan:', standardPlans[0]);
            }
            if (unlimitedPlans.length > 0) {
                console.log('First unlimited plan:', unlimitedPlans[0]);
            }
            
            return true;
        } else {
            console.warn('❌ Failed to load plans from API - result.success is false or no data');
            console.warn('Result:', result);
            return false;
        }
    } catch (error) {
        console.error('❌ Error loading plans from API:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        // Fallback к захардкоженным планам
        standardPlans = [
            { data: '1 GB', duration: '7 Days', price: '$ 9.99', id: 'plan1' },
            { data: '2 GB', duration: '7 Days', price: '$ 9.99', id: 'plan2' },
            { data: '3 GB', duration: '30 Days', price: '$ 9.99', id: 'plan3' },
            { data: '5 GB', duration: '30 Days', price: '$ 9.99', id: 'plan4' }
        ];
        
        unlimitedPlans = [
            { data: '∞ GB', duration: '7 Days', price: '$ 9.99', id: 'unlimited1' },
            { data: '∞ GB', duration: '7 Days', price: '$ 9.99', id: 'unlimited2' },
            { data: '∞ GB', duration: '30 Days', price: '$ 9.99', id: 'unlimited3' },
            { data: '∞ GB', duration: '30 Days', price: '$ 9.99', id: 'unlimited4' }
        ];
        console.warn('⚠️ Using fallback plans (hardcoded)');
        return false;
    }
}

// Store original price and discount state
let originalPrice = '';
let originalPriceValue = 0; // Числовое значение базовой цены (БЕЗ наценки способа оплаты)
let isPromoApplied = false;
let discountPercent = 0;
let discountAmount = 0; // Фиксированная скидка в долларах
let appliedPromocode = null; // Информация о примененном промокоде
let publicSettings = null; // Настройки наценок

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
    
    console.log('✅ Payment method UI initialized', {
        btn: btn,
        btnWidth: btn.offsetWidth,
        btnComputedStyle: window.getComputedStyle(btn).width
    });

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
        console.log('💳 Payment method button clicked', e);
        e.preventDefault();
        e.stopPropagation();
        open();
    });
    
    // Для touch устройств
    btn.addEventListener('touchend', (e) => {
        console.log('💳 Payment method button touched', e);
        e.preventDefault();
        e.stopPropagation();
        open();
    });
    
    // Дополнительный обработчик для надежности
    btn.onclick = (e) => {
        console.log('💳 Payment method button onclick', e);
        e.preventDefault();
        e.stopPropagation();
        open();
    };
    
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
        updateTotalPrice(); // Обновляем цену при изменении способа оплаты
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
 * Обработка покупки
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
        const selectedPlan = orderWithUser.planType === 'unlimited' 
            ? unlimitedPlans.find(p => p.id === orderWithUser.planId || p.bundle_name === orderWithUser.planId)
            : standardPlans.find(p => p.id === orderWithUser.planId || p.bundle_name === orderWithUser.planId);
        
        if (!selectedPlan) {
            throw new Error('Plan not found');
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
        
        // Создаем заказ
        const isExtend = orderData.extend && orderData.iccid;
        purchaseBtn.textContent = isExtend 
            ? (testMode ? 'Validating top-up...' : 'Adding traffic...')
            : (testMode ? 'Validating order...' : 'Creating order...');
        
        // Преобразуем код страны в полное название, если name пустое или является кодом
        let countryName = orderWithUser.name;
        if (!countryName || countryName.length === 2 || (orderWithUser.code && countryName === orderWithUser.code)) {
            countryName = getCountryNameFromCode(orderWithUser.code || countryName);
            console.log('[Checkout] Converted country code to name for order:', {
                code: orderWithUser.code,
                originalName: orderWithUser.name,
                convertedName: countryName
            });
        }
        
        const orderPayload = {
            bundle_name: bundleName,
            telegram_user_id: orderWithUser.telegram_user_id,
            telegram_username: orderWithUser.telegram_username,
            user_name: orderWithUser.user_name,
            country_code: orderWithUser.code,
            country_name: countryName, // Используем преобразованное название
            plan_id: orderWithUser.planId,
            plan_type: orderWithUser.planType,
            test_mode: testMode
        };
        
        // Если это extend, добавляем iccid для добавления трафика к существующей eSIM
        if (isExtend) {
            orderPayload.iccid = orderData.iccid;
            console.log('[Checkout] 🔄 Adding traffic to existing eSIM:', {
                iccid: orderData.iccid,
                bundle_name: bundleName,
                country_code: orderWithUser.code,
                country_name: countryName
            });
        }
        
        const orderResponse = await fetch('/api/esimgo/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });
        
        // Проверяем статус ответа перед парсингом
        if (!orderResponse.ok) {
            const errorText = await orderResponse.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                throw new Error(errorText || `Server error: ${orderResponse.status}`);
            }
            throw new Error(errorData.error || errorData.message || `Server error: ${orderResponse.status}`);
        }
        
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
        
        // Проверяем статус ответа перед парсингом
        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                throw new Error(errorText || `Server error: ${response.status}`);
            }
            throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
        }
        
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
const FLAG_VERSION = 'v8'; // Updated: fix flag styling (rounded corners, proper sizing)

// Function to get flag image URL from local flags folder
// ISO to country name mapping (for converting country codes to full names)
const isoToCountryName = {
    'AD': 'Andorra', 'AE': 'United Arab Emirates', 'AF': 'Afghanistan', 'AG': 'Antigua and Barbuda',
    'AI': 'Anguilla', 'AL': 'Albania', 'AM': 'Armenia', 'AO': 'Angola', 'AQ': 'Antarctica',
    'AR': 'Argentina', 'AS': 'American Samoa', 'AT': 'Austria', 'AU': 'Australia', 'AW': 'Aruba',
    'AX': 'Åland Islands', 'AZ': 'Azerbaijan', 'BA': 'Bosnia and Herzegovina', 'BB': 'Barbados',
    'BD': 'Bangladesh', 'BE': 'Belgium', 'BF': 'Burkina Faso', 'BG': 'Bulgaria', 'BH': 'Bahrain',
    'BI': 'Burundi', 'BJ': 'Benin', 'BL': 'Saint Barthélemy', 'BM': 'Bermuda', 'BN': 'Brunei',
    'BO': 'Bolivia', 'BQ': 'Caribbean Netherlands', 'BR': 'Brazil', 'BS': 'Bahamas', 'BT': 'Bhutan',
    'BV': 'Bouvet Island', 'BW': 'Botswana', 'BY': 'Belarus', 'BZ': 'Belize', 'CA': 'Canada',
    'CC': 'Cocos Islands', 'CD': 'Congo, Democratic Republic', 'CF': 'Central African Republic',
    'CG': 'Congo', 'CH': 'Switzerland', 'CI': 'Côte d\'Ivoire', 'CK': 'Cook Islands', 'CL': 'Chile',
    'CM': 'Cameroon', 'CN': 'China', 'CO': 'Colombia', 'CR': 'Costa Rica', 'CU': 'Cuba',
    'CV': 'Cabo Verde', 'CW': 'Curaçao', 'CX': 'Christmas Island', 'CY': 'Cyprus',
    'CZ': 'Czech Republic', 'DE': 'Germany', 'DJ': 'Djibouti', 'DK': 'Denmark', 'DM': 'Dominica',
    'DO': 'Dominican Republic', 'DZ': 'Algeria', 'EC': 'Ecuador', 'EE': 'Estonia', 'EG': 'Egypt',
    'EH': 'Western Sahara', 'ER': 'Eritrea', 'ES': 'Spain', 'ET': 'Ethiopia', 'FI': 'Finland',
    'FJ': 'Fiji', 'FK': 'Falkland Islands', 'FM': 'Micronesia', 'FO': 'Faroe Islands', 'FR': 'France',
    'GA': 'Gabon', 'GB': 'United Kingdom', 'GD': 'Grenada', 'GE': 'Georgia', 'GF': 'French Guiana',
    'GG': 'Guernsey', 'GH': 'Ghana', 'GI': 'Gibraltar', 'GL': 'Greenland', 'GM': 'Gambia',
    'GN': 'Guinea', 'GP': 'Guadeloupe', 'GQ': 'Equatorial Guinea', 'GR': 'Greece', 'GS': 'South Georgia',
    'GT': 'Guatemala', 'GU': 'Guam', 'GW': 'Guinea-Bissau', 'GY': 'Guyana', 'HK': 'Hong Kong',
    'HM': 'Heard Island', 'HN': 'Honduras', 'HR': 'Croatia', 'HT': 'Haiti', 'HU': 'Hungary',
    'ID': 'Indonesia', 'IE': 'Ireland', 'IL': 'Israel', 'IM': 'Isle of Man', 'IN': 'India',
    'IO': 'British Indian Ocean Territory', 'IQ': 'Iraq', 'IR': 'Iran', 'IS': 'Iceland', 'IT': 'Italy',
    'JE': 'Jersey', 'JM': 'Jamaica', 'JO': 'Jordan', 'JP': 'Japan', 'KE': 'Kenya', 'KG': 'Kyrgyzstan',
    'KH': 'Cambodia', 'KI': 'Kiribati', 'KM': 'Comoros', 'KN': 'Saint Kitts and Nevis', 'KP': 'Korea, North',
    'KR': 'Korea, South', 'KW': 'Kuwait', 'KY': 'Cayman Islands', 'KZ': 'Kazakhstan', 'LA': 'Laos',
    'LB': 'Lebanon', 'LC': 'Saint Lucia', 'LI': 'Liechtenstein', 'LK': 'Sri Lanka', 'LR': 'Liberia',
    'LS': 'Lesotho', 'LT': 'Lithuania', 'LU': 'Luxembourg', 'LV': 'Latvia', 'LY': 'Libya',
    'MA': 'Morocco', 'MC': 'Monaco', 'MD': 'Moldova', 'ME': 'Montenegro', 'MF': 'Saint Martin',
    'MG': 'Madagascar', 'MH': 'Marshall Islands', 'MK': 'North Macedonia', 'ML': 'Mali', 'MM': 'Myanmar',
    'MN': 'Mongolia', 'MO': 'Macao', 'MP': 'Northern Mariana Islands', 'MQ': 'Martinique', 'MR': 'Mauritania',
    'MS': 'Montserrat', 'MT': 'Malta', 'MU': 'Mauritius', 'MV': 'Maldives', 'MW': 'Malawi',
    'MX': 'Mexico', 'MY': 'Malaysia', 'MZ': 'Mozambique', 'NA': 'Namibia', 'NC': 'New Caledonia',
    'NE': 'Niger', 'NF': 'Norfolk Island', 'NG': 'Nigeria', 'NI': 'Nicaragua', 'NL': 'Netherlands',
    'NO': 'Norway', 'NP': 'Nepal', 'NR': 'Nauru', 'NU': 'Niue', 'NZ': 'New Zealand', 'OM': 'Oman',
    'PA': 'Panama', 'PE': 'Peru', 'PF': 'French Polynesia', 'PG': 'Papua New Guinea', 'PH': 'Philippines',
    'PK': 'Pakistan', 'PL': 'Poland', 'PM': 'Saint Pierre and Miquelon', 'PN': 'Pitcairn', 'PR': 'Puerto Rico',
    'PS': 'Palestine', 'PT': 'Portugal', 'PW': 'Palau', 'PY': 'Paraguay', 'QA': 'Qatar', 'RE': 'Réunion',
    'RO': 'Romania', 'RS': 'Serbia', 'RU': 'Russia', 'RW': 'Rwanda', 'SA': 'Saudi Arabia', 'SB': 'Solomon Islands',
    'SC': 'Seychelles', 'SD': 'Sudan', 'SE': 'Sweden', 'SG': 'Singapore', 'SH': 'Saint Helena',
    'SI': 'Slovenia', 'SJ': 'Svalbard', 'SK': 'Slovakia', 'SL': 'Sierra Leone', 'SM': 'San Marino',
    'SN': 'Senegal', 'SO': 'Somalia', 'SR': 'Suriname', 'SS': 'South Sudan', 'ST': 'Sao Tome and Principe',
    'SV': 'El Salvador', 'SX': 'Sint Maarten', 'SY': 'Syria', 'SZ': 'Eswatini', 'TC': 'Turks and Caicos',
    'TD': 'Chad', 'TF': 'French Southern Territories', 'TG': 'Togo', 'TH': 'Thailand', 'TJ': 'Tajikistan',
    'TK': 'Tokelau', 'TL': 'Timor-Leste', 'TM': 'Turkmenistan', 'TN': 'Tunisia', 'TO': 'Tonga',
    'TR': 'Turkey', 'TT': 'Trinidad and Tobago', 'TV': 'Tuvalu', 'TW': 'Taiwan', 'TZ': 'Tanzania',
    'UA': 'Ukraine', 'UG': 'Uganda', 'UM': 'United States Minor Outlying Islands', 'US': 'United States',
    'UY': 'Uruguay', 'UZ': 'Uzbekistan', 'VA': 'Vatican City', 'VC': 'Saint Vincent and the Grenadines',
    'VE': 'Venezuela', 'VG': 'British Virgin Islands', 'VI': 'U.S. Virgin Islands', 'VN': 'Vietnam',
    'VU': 'Vanuatu', 'WF': 'Wallis and Futuna', 'WS': 'Samoa', 'YE': 'Yemen', 'YT': 'Mayotte',
    'ZA': 'South Africa', 'ZM': 'Zambia', 'ZW': 'Zimbabwe'
};

// Convert country code to full country name
function getCountryNameFromCode(code) {
    if (!code) return '';
    const upperCode = code.toUpperCase();
    return isoToCountryName[upperCode] || code;
}

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
    
    // Загружаем настройки наценок
    await loadPublicSettings();
    
    // Загружаем реальные планы из API
    console.log('🔵 DOMContentLoaded - orderData:', orderData);
    const countryCode = orderData?.code || null;
    const regionName = orderData?.name || null;
    const orderType = orderData?.type || 'country';
    console.log('🔵 Loading plans:', { countryCode, regionName, orderType });
    
    const plansLoaded = await loadPlansFromAPI(countryCode, regionName, orderType);
    
    console.log('🔵 Plans loaded status:', plansLoaded, {
        standardCount: standardPlans.length,
        unlimitedCount: unlimitedPlans.length,
        firstPlan: standardPlans[0] || unlimitedPlans[0]
    });
    
    try {
        console.log('🔵 Calling setupOrderDetails...');
        setupOrderDetails();
    } catch (e) {
        console.error('❌ Error in setupOrderDetails:', e);
    }
    
    try {
        console.log('🔵 Calling setupPromoCode...');
        setupPromoCode();
    } catch (e) {
        console.error('❌ Error in setupPromoCode:', e);
    }
    
    try {
        console.log('🔵 Calling setupPaymentMethodUI...');
        setupPaymentMethodUI();
    } catch (e) {
        console.error('❌ Error in setupPaymentMethodUI:', e);
    }
    
    try {
        console.log('🔵 Calling setupPurchaseButton...');
        setupPurchaseButton();
    } catch (e) {
        console.error('❌ Error in setupPurchaseButton:', e);
    }
    
    try {
        console.log('🔵 Calling setupStarsButton...');
        setupStarsButton();
    } catch (e) {
        console.error('❌ Error in setupStarsButton:', e);
    }
    
    try {
        console.log('🔵 Calling setupNavigation...');
        setupNavigation();
    } catch (e) {
        console.error('❌ Error in setupNavigation:', e);
    }
    
    // Если планы загрузились, обновляем отображение
    if (plansLoaded && (standardPlans.length > 0 || unlimitedPlans.length > 0)) {
        updateOrderDetailsWithRealPlans();
    }

    updateStarsPriceDisplay();
});

// Setup order details
function setupOrderDetails() {
    const headerElement = document.getElementById('checkoutHeader');
    const planDetailsElement = document.getElementById('checkoutPlanDetails');
    const totalPriceElement = document.getElementById('checkoutTotalPrice');
    
    // Setup location info in header
    if (orderData.type === 'country') {
        // Если name пустое или является кодом страны (2 буквы), преобразуем в полное название
        let countryName = orderData.name;
        if (!countryName || countryName.length === 2 || (orderData.code && countryName === orderData.code)) {
            countryName = getCountryNameFromCode(orderData.code || countryName);
            console.log('[Checkout] Converted country code to name:', {
                code: orderData.code,
                originalName: orderData.name,
                convertedName: countryName
            });
        }
        
        const flagPath = getFlagPath(orderData.code);
        const flagElement = flagPath 
            ? `<img src="${flagPath}" alt="${countryName} flag" class="checkout-flag">`
            : '<span class="checkout-flag">🏳️</span>';
        
        headerElement.innerHTML = `
            <span class="checkout-country-name">${countryName}</span>
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
    
    // Улучшенный поиск плана: ищем по id, bundle_name или по индексу
    let selectedPlan = plans.find(p => 
        p.id === orderData.planId || 
        p.bundle_name === orderData.planId ||
        (p.id && p.id.toString() === orderData.planId.toString())
    );
    
    // Если не найден и planId содержит индекс (например, "plan2" или "unlimited1")
    if (!selectedPlan && orderData.planId) {
        const indexMatch = orderData.planId.match(/(\d+)$/);
        if (indexMatch) {
            const index = parseInt(indexMatch[1]) - 1; // plan1 = index 0, plan2 = index 1, etc.
            if (index >= 0 && index < plans.length) {
                selectedPlan = plans[index];
                console.log('[Checkout] Found plan by index:', { planId: orderData.planId, index, foundPlan: selectedPlan });
            }
        }
    }
    
    // Fallback на первый план
    if (!selectedPlan) {
        selectedPlan = plans[0];
        console.warn('[Checkout] Plan not found, using first plan:', { planId: orderData.planId, availableIds: plans.slice(0, 3).map(p => ({ id: p.id, bundle_name: p.bundle_name })) });
    }
    
    if (selectedPlan) {
        planDetailsElement.innerHTML = `
            <span class="checkout-plan-amount">${selectedPlan.data}</span>
            <span class="checkout-plan-duration">${selectedPlan.duration}</span>
        `;
        
        // Store original price (используем реальную цену из API или fallback)
        originalPrice = selectedPlan.price || selectedPlan.priceValue || '$ 9.99';
        
        // Извлекаем числовое значение цены (БЕЗ наценки способа оплаты)
        // Цена из API уже содержит базовую наценку, но не содержит наценку способа оплаты
        const priceMatch = originalPrice.match(/\$?\s*([\d.]+)/);
        originalPriceValue = priceMatch ? parseFloat(priceMatch[1]) : 0;
        
        // Если priceValue есть в плане напрямую, используем его
        if (selectedPlan.priceValue && typeof selectedPlan.priceValue === 'number') {
            originalPriceValue = selectedPlan.priceValue;
            if (!originalPrice || originalPrice === '$ 9.99') {
                originalPrice = `$ ${originalPriceValue.toFixed(2)}`;
            }
        }
        
        console.log('[Checkout] Setup order details with plan:', {
            planId: orderData.planId,
            selectedPlan: {
                id: selectedPlan.id,
                bundle_name: selectedPlan.bundle_name,
                data: selectedPlan.data,
                duration: selectedPlan.duration,
                price: selectedPlan.price,
                priceValue: selectedPlan.priceValue
            },
            originalPrice,
            originalPriceValue
        });
    } else {
        // Fallback если план не найден
        console.warn('[Checkout] ⚠️ Plan not found, using fallback');
        planDetailsElement.innerHTML = `
            <span class="checkout-plan-amount">Loading...</span>
            <span class="checkout-plan-duration">Loading...</span>
        `;
        originalPrice = '$ 9.99';
        originalPriceValue = 9.99;
    }
    
    // Update total price
    updateTotalPrice();
    
    // Показываем элементы после установки данных
    if (planDetailsElement) {
        planDetailsElement.style.opacity = '1';
        planDetailsElement.style.transition = 'opacity 0.3s ease-in';
    }
    if (totalPriceElement) {
        totalPriceElement.style.opacity = '1';
        totalPriceElement.style.transition = 'opacity 0.3s ease-in';
    }
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
    
    // Улучшенный поиск плана: ищем по id, bundle_name или по индексу
    let selectedPlan = plans.find(p => 
        p.id === orderData.planId || 
        p.bundle_name === orderData.planId ||
        (p.id && p.id.toString() === orderData.planId.toString())
    );
    
    // Если не найден и planId содержит индекс (например, "plan2" или "unlimited1")
    if (!selectedPlan && orderData.planId) {
        const indexMatch = orderData.planId.match(/(\d+)$/);
        if (indexMatch) {
            const index = parseInt(indexMatch[1]) - 1; // plan1 = index 0, plan2 = index 1, etc.
            if (index >= 0 && index < plans.length) {
                selectedPlan = plans[index];
                console.log('[Checkout] Found plan by index in updateOrderDetails:', { planId: orderData.planId, index, foundPlan: selectedPlan });
            }
        }
    }
    
    // Fallback на первый план
    if (!selectedPlan && plans.length > 0) {
        selectedPlan = plans[0];
        console.warn('[Checkout] Plan not found in updateOrderDetails, using first plan:', { planId: orderData.planId, availableIds: plans.slice(0, 3).map(p => ({ id: p.id, bundle_name: p.bundle_name })) });
    }
    
    if (selectedPlan) {
        // Обновляем детали плана
        planDetailsElement.innerHTML = `
            <span class="checkout-plan-amount">${selectedPlan.data}</span>
            <span class="checkout-plan-duration">${selectedPlan.duration}</span>
        `;
        
        // Обновляем цену
        originalPrice = selectedPlan.price || selectedPlan.priceValue || '$ 9.99';
        
        // Извлекаем числовое значение цены
        const priceMatch = originalPrice.match(/\$?\s*([\d.]+)/);
        originalPriceValue = priceMatch ? parseFloat(priceMatch[1]) : 0;
        
        // Если priceValue есть в плане напрямую, используем его
        if (selectedPlan.priceValue && typeof selectedPlan.priceValue === 'number') {
            originalPriceValue = selectedPlan.priceValue;
            if (!originalPrice || originalPrice === '$ 9.99') {
                originalPrice = `$ ${originalPriceValue.toFixed(2)}`;
            }
        }
        
        // Если цена все еще не установлена, используем fallback
        if (!originalPriceValue || originalPriceValue === 0 || isNaN(originalPriceValue)) {
            console.warn('[Checkout] ⚠️ Price value is invalid, using fallback');
            originalPriceValue = 9.99;
            originalPrice = '$ 9.99';
        }
        
        updateTotalPrice();
        
        // Показываем элементы после обновления данных
        if (planDetailsElement) {
            planDetailsElement.style.opacity = '1';
            planDetailsElement.style.transition = 'opacity 0.3s ease-in';
        }
        if (totalPriceElement) {
            totalPriceElement.style.opacity = '1';
            totalPriceElement.style.transition = 'opacity 0.3s ease-in';
        }
        
        console.log('[Checkout] Order details updated with real plan:', {
            plan: selectedPlan.data,
            duration: selectedPlan.duration,
            price: selectedPlan.price,
            priceValue: selectedPlan.priceValue,
            originalPrice,
            originalPriceValue
        });
    } else {
        console.warn('[Checkout] ⚠️ No plan found in updateOrderDetailsWithRealPlans');
        // Устанавливаем fallback цену даже если план не найден
        originalPrice = '$ 9.99';
        originalPriceValue = 9.99;
        updateTotalPrice();
    }
}

function getSelectedPlan() {
    const plans = orderData.planType === 'unlimited' ? unlimitedPlans : standardPlans;
    
    if (!plans || plans.length === 0) {
        console.warn('[Stars] No plans available');
        return null;
    }
    
    console.log('[Stars] Searching for plan:', {
        planId: orderData.planId,
        planType: orderData.planType,
        totalPlans: plans.length,
        firstPlanIds: plans.slice(0, 3).map(p => ({ id: p.id, bundle_name: p.bundle_name }))
    });
    
    // Ищем план по ID или bundle_name (с учетом разных форматов)
    let selectedPlan = plans.find(p => {
        const planIdStr = String(p.id || '').toLowerCase().trim();
        const bundleNameStr = String(p.bundle_name || '').toLowerCase().trim();
        const searchIdStr = String(orderData.planId || '').toLowerCase().trim();
        
        return planIdStr === searchIdStr || 
               bundleNameStr === searchIdStr ||
               (planIdStr && planIdStr === searchIdStr) ||
               (bundleNameStr && bundleNameStr === searchIdStr);
    });
    
    // Если не найден и planId содержит индекс (например, "plan2" или "unlimited1")
    if (!selectedPlan && orderData.planId) {
        const indexMatch = orderData.planId.match(/(\d+)$/);
        if (indexMatch) {
            const index = parseInt(indexMatch[1]) - 1; // plan1 = index 0, plan2 = index 1, etc.
            if (index >= 0 && index < plans.length) {
                selectedPlan = plans[index];
                console.log('[Stars] Found plan by index:', { planId: orderData.planId, index, foundPlan: selectedPlan });
            }
        }
    }
    
    // Если все еще не найден, используем первый план как fallback
    if (!selectedPlan) {
        console.warn('[Stars] Plan not found by ID, using first plan:', {
            planId: orderData.planId,
            availableIds: plans.slice(0, 5).map(p => ({ id: p.id, bundle_name: p.bundle_name })),
            totalPlans: plans.length
        });
        selectedPlan = plans[0];
    }
    
    console.log('[Stars] Selected plan:', {
        planId: orderData.planId,
        foundPlan: {
            id: selectedPlan?.id,
            bundle_name: selectedPlan?.bundle_name,
            price: selectedPlan?.price,
            priceValue: selectedPlan?.priceValue
        }
    });
    
    return selectedPlan;
}

function getPriceValueFromPlan(plan) {
    if (!plan) return null;
    if (typeof plan.priceValue === 'number') return plan.priceValue;
    if (plan.price) {
        const match = plan.price.match(/([\d.,]+)/);
        if (match) {
            const parsed = parseFloat(match[1].replace(',', '.'));
            if (!Number.isNaN(parsed)) return parsed;
        }
    }
    return null;
}

function computeStars(priceValue) {
    if (!priceValue || Number.isNaN(priceValue)) return null;
    return Math.max(1, Math.ceil(priceValue * STARS_RATE_DISPLAY));
}

function updateStarsPriceDisplay() {
    const starsPriceElement = document.getElementById('checkoutStarsPrice');
    if (!starsPriceElement) return;

    if (!ENABLE_STARS) {
        starsPriceElement.style.display = 'none';
        return;
    }

    const plan = getSelectedPlan();
    const priceValue = getPriceValueFromPlan(plan);
    const stars = computeStars(priceValue);

    if (stars) {
        starsPriceElement.style.display = 'block';
        starsPriceElement.textContent = `≈ ${stars} Stars`;
    } else {
        starsPriceElement.style.display = 'none';
    }
}

// Update total price display with discount if applicable
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

function updateTotalPrice() {
    const totalPriceElement = document.getElementById('checkoutTotalPrice');
    
    if (!totalPriceElement) {
        console.error('[Checkout] ❌ totalPriceElement not found!');
        return;
    }
    
    console.log('[Checkout] updateTotalPrice called:', {
        originalPrice,
        originalPriceValue,
        hasPublicSettings: !!publicSettings,
        selectedPaymentMethod,
        isPromoApplied,
        discountPercent,
        discountAmount
    });
    
    // Используем базовую цену (БЕЗ наценки способа оплаты)
    let basePrice = originalPriceValue || 0;
    
    // Если базовой цены нет, пытаемся извлечь из строки
    if (basePrice === 0 && originalPrice) {
        const priceMatch = originalPrice.match(/\$?\s*([\d.]+)/);
        if (priceMatch) {
            basePrice = parseFloat(priceMatch[1]);
            console.log('[Checkout] Extracted basePrice from originalPrice string:', basePrice);
        }
    }
    
    // Если цена все еще 0, устанавливаем fallback
    if (basePrice === 0 || isNaN(basePrice)) {
        console.warn('[Checkout] ⚠️ basePrice is 0 or NaN, using fallback');
        if (originalPrice && originalPrice !== '$ 9.99') {
            const fallbackMatch = originalPrice.match(/\$?\s*([\d.]+)/);
            if (fallbackMatch) {
                basePrice = parseFloat(fallbackMatch[1]);
            }
        }
        // Если все еще 0, используем дефолтную цену
        if (basePrice === 0 || isNaN(basePrice)) {
            basePrice = 9.99;
            console.warn('[Checkout] ⚠️ Using default fallback price: $9.99');
        }
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
                console.log(`[Checkout] Applied payment method markup: ${paymentMethodKey} = ${paymentMethod.markupMultiplier}, price: ${basePrice}`);
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
        
        const originalPriceDisplay = basePrice > 0 ? `$ ${basePrice.toFixed(2)}` : (originalPrice || '$ 9.99');
        const newPrice = `$ ${discountedPrice.toFixed(2)}`;
        
        totalPriceElement.innerHTML = `
            <span class="checkout-total-price-old">${originalPriceDisplay}</span>
            <span class="checkout-total-price-new">${newPrice}</span>
        `;
        console.log('[Checkout] Price updated with promo:', { originalPriceDisplay, newPrice });
    } else {
        // Без промокода, но с наценкой способа оплаты
        const finalPrice = basePrice > 0 ? `$ ${basePrice.toFixed(2)}` : (originalPrice || '$ 9.99');
        totalPriceElement.textContent = finalPrice;
        console.log('[Checkout] Price updated without promo:', finalPrice);
    }
    
    // ВСЕГДА показываем цену после обновления
    if (totalPriceElement.style.opacity === '0' || totalPriceElement.textContent === '—' || totalPriceElement.textContent.trim() === '') {
        totalPriceElement.style.opacity = '1';
        totalPriceElement.style.transition = 'opacity 0.3s ease-in';
        console.log('[Checkout] ✅ Price element made visible');
    }

    // Обновляем отображение Stars после пересчёта цены
    updateStarsPriceDisplay();
}

// Setup promo code
function setupPromoCode() {
    const promoBtn = document.getElementById('promoBtn');
    const promoInput = document.getElementById('promoInput');
    const promoError = document.getElementById('promoError');
    const promoSuccess = document.getElementById('promoSuccess');
    
    console.log('🔵 Setting up promo code:', {
        promoBtn: !!promoBtn,
        promoInput: !!promoInput,
        promoError: !!promoError,
        promoSuccess: !!promoSuccess
    });
    
    if (promoBtn && promoInput && promoError && promoSuccess) {
        promoBtn.addEventListener('click', async (e) => {
            console.log('🔵 Promo button clicked', e);
            e.preventDefault();
            e.stopPropagation();
            
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
            // Если поле в фокусе, прокручиваем снова (с debounce)
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
    
    // Деактивируем кнопку в режиме разработки
    if (DEV_MODE) {
        purchaseBtn.disabled = true;
        purchaseBtn.textContent = 'Purchase (Disabled - Dev Mode)';
        purchaseBtn.style.opacity = '0.5';
        purchaseBtn.style.cursor = 'not-allowed';
        console.log('⚠️ Purchase button disabled - Development mode');
        return;
    }
    
    purchaseBtn.addEventListener('click', async () => {
        const auth = window.telegramAuth;
        
        // Проверка авторизации
        if (!auth || !auth.isAuthenticated()) {
            alert('Please authorize through Telegram to place an order');
            if (tg) {
                tg.HapticFeedback.notificationOccurred('error');
            }
            return;
        }
        
        if (tg) {
            tg.HapticFeedback.impactOccurred('medium');
        }
        
        // Показываем индикатор загрузки
        const originalText = purchaseBtn.textContent;
        purchaseBtn.disabled = true;
        
        // ✅ ВАЖНО: Проверяем метод оплаты ПЕРЕД валидацией
        // Для Telegram Stars валидация не критична, можно пропустить
        console.log('💳 Selected payment method:', selectedPaymentMethod);
        
        if (selectedPaymentMethod === 'stars') {
            // Если выбран Telegram Stars, обрабатываем Stars payment БЕЗ валидации
            console.log('💫 Telegram Stars payment selected - skipping validation');
            
            if (!tg || !tg.openInvoice) {
                purchaseBtn.textContent = originalText;
                purchaseBtn.disabled = false;
                throw new Error('Payment with Stars is only available inside Telegram');
            }
            
            const plan = getSelectedPlan();
            if (!plan) {
                purchaseBtn.textContent = originalText;
                purchaseBtn.disabled = false;
                throw new Error('Plan not found. Please refresh the page.');
            }
            
            purchaseBtn.textContent = 'Creating invoice...';
            
            try {
                const priceValue = getPriceValueFromPlan(plan);
                const currency = plan.currency || 'USD';
                const bundleName = plan.bundle_name || plan.id;
                
                // ✅ ВАЖНО: Вычисляем себестоимость (cost), разделив цену на базовую маржу
                const baseMarkup = publicSettings?.markup?.base || publicSettings?.markup?.defaultMultiplier || 1.29;
                const costPrice = priceValue / baseMarkup;
                
                console.log('[Stars] Price calculation:', {
                    priceWithMarkup: priceValue,
                    baseMarkup: baseMarkup,
                    costPrice: costPrice.toFixed(2)
                });
                
                console.log('[Stars] Creating invoice with data:', {
                    plan_id: plan.id,
                    plan_type: orderData.planType,
                    bundle_name: bundleName,
                    country_code: orderData.code,
                    country_name: orderData.name,
                    price: costPrice,
                    currency
                });
                
                let response;
                try {
                    // Создаем AbortController для таймаута (30 секунд)
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 30000);
                    
                    const invoicePayload = {
                        plan_id: plan.id,
                        plan_type: orderData.planType,
                        bundle_name: bundleName,
                        country_code: orderData.code,
                        country_name: orderData.name,
                        price: costPrice, // ✅ Передаем СЕБЕСТОИМОСТЬ, а не цену с маржой!
                        currency,
                        telegram_user_id: auth.getUserId(),
                        telegram_username: auth.getUsername()
                    };
                    
                    // Детальное логирование перед проверкой extend
                    console.log('[Stars] 🔍 Checking extend mode before adding iccid:', {
                        orderData_extend: orderData.extend,
                        orderData_iccid: orderData.iccid,
                        hasExtend: !!orderData.extend,
                        hasIccid: !!orderData.iccid,
                        extendValue: orderData.extend,
                        iccidValue: orderData.iccid,
                        fullOrderData: JSON.stringify(orderData, null, 2)
                    });
                    
                    // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Более строгая проверка для Extend mode
                    // Проверяем, что extend === true (не просто truthy) и iccid не пустой
                    const isExtendMode = orderData.extend === true && orderData.iccid && orderData.iccid.trim() !== '';
                    
                    if (isExtendMode) {
                        invoicePayload.iccid = orderData.iccid.trim(); // Убираем пробелы
                        console.log('[Stars] 🔄 Extend mode: Adding traffic to existing eSIM:', {
                            iccid: invoicePayload.iccid,
                            bundle_name: bundleName,
                            country_code: orderData.code || invoicePayload.country_code,
                            country_name: orderData.name || invoicePayload.country_name,
                            plan_id: plan.id || plan.bundle_name,
                            fullInvoicePayload: JSON.stringify(invoicePayload, null, 2)
                        });
                    } else {
                        console.warn('[Stars] ⚠️ Extend mode NOT activated:', {
                            orderData_extend: orderData.extend,
                            orderData_extendType: typeof orderData.extend,
                            orderData_iccid: orderData.iccid,
                            orderData_iccidType: typeof orderData.iccid,
                            orderData_iccidLength: orderData.iccid ? orderData.iccid.length : 0,
                            isExtendMode: isExtendMode,
                            reason: !orderData.extend ? 'extend is false/undefined' : (!orderData.iccid || orderData.iccid.trim() === '' ? 'iccid is empty/undefined' : 'unknown'),
                            invoicePayloadKeys: Object.keys(invoicePayload),
                            fullOrderData: JSON.stringify(orderData, null, 2)
                        });
                    }
                    
                    response = await fetch('/api/telegram/stars/create-invoice', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(invoicePayload),
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                } catch (fetchError) {
                    console.error('❌ Fetch error:', fetchError);
                    purchaseBtn.textContent = originalText;
                    purchaseBtn.disabled = false;
                    
                    if (fetchError.name === 'AbortError') {
                        throw new Error('Request timeout. Please try again.');
                    }
                    throw new Error('Network error: ' + fetchError.message);
                }
                
                if (!response.ok) {
                    const errorText = await response.text();
                    let errorData;
                    try {
                        errorData = JSON.parse(errorText);
                    } catch (e) {
                        purchaseBtn.textContent = originalText;
                        purchaseBtn.disabled = false;
                        throw new Error(errorText || `Server error: ${response.status}`);
                    }
                    purchaseBtn.textContent = originalText;
                    purchaseBtn.disabled = false;
                    throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
                }
                
                const result = await response.json();
                console.log('💫 Invoice creation result:', {
                    success: result.success,
                    hasInvoiceLink: !!result.invoiceLink,
                    invoiceLinkLength: result.invoiceLink?.length,
                    error: result.error
                });
                
                if (!result.success || !result.invoiceLink) {
                    purchaseBtn.textContent = originalText;
                    purchaseBtn.disabled = false;
                    throw new Error(result.error || 'Failed to create invoice');
                }
                
                const invoiceLink = result.invoiceLink;
                console.log('💫 Invoice link received (full):', invoiceLink);
                console.log('💫 Invoice link type:', typeof invoiceLink);
                
                // Проверяем формат ссылки и извлекаем правильный ID
                let invoiceId;
                if (invoiceLink.startsWith('https://t.me/invoice/')) {
                    // Извлекаем slug из полного URL
                    invoiceId = invoiceLink.split('/').pop();
                } else if (invoiceLink.startsWith('invoice/')) {
                    // Уже в формате invoice/...
                    invoiceId = invoiceLink.replace('invoice/', '');
                } else if (invoiceLink.startsWith('https://')) {
                    // Другой формат полного URL - пробуем извлечь slug
                    const urlParts = invoiceLink.split('/');
                    invoiceId = urlParts[urlParts.length - 1] || invoiceLink;
                } else {
                    // Пробуем использовать как есть (возможно, уже slug)
                    invoiceId = invoiceLink;
                }
                
                console.log('💫 Invoice ID to open:', invoiceId);
                
                const cb = (status) => {
                    console.log('💫 Invoice status callback received:', status);
                    purchaseBtn.textContent = originalText;
                    purchaseBtn.disabled = false;
                    if (status === 'paid') {
                        // Успешная оплата - заказ будет создан через webhook
                        console.log('✅ Payment successful! Redirecting to My eSIMs...');
                        if (tg) {
                            tg.HapticFeedback.notificationOccurred('success');
                            tg.showAlert('✅ Payment successful! Your eSIM will be sent to you shortly.');
                        }
                        // Редирект на страницу My eSIMs после успешной оплаты
                        setTimeout(() => {
                            console.log('🔄 Redirecting to my-esims.html...');
                            window.location.href = 'my-esims.html';
                        }, 2000);
                    } else if (status === 'cancelled') {
                        // Пользователь отменил оплату
                        if (tg) {
                            tg.HapticFeedback.notificationOccurred('error');
                        }
                        // Показываем собственное модальное окно с кнопкой "Close" на английском
                        showCustomAlert('Payment cancelled.');
                    } else if (status === 'failed') {
                        // Ошибка оплаты
                        if (tg) {
                            tg.HapticFeedback.notificationOccurred('error');
                        }
                        // Показываем собственное модальное окно с кнопкой "Close" на английском
                        showCustomAlert('Payment failed. Please try again.');
                    } else if (status === 'pending') {
                        // Платеж в обработке
                        console.log('Payment is pending...');
                    }
                };
                
                // Открываем модальное окно Telegram Stars
                try {
                    // Сначала пробуем передать slug
                    tg.openInvoice(invoiceId, cb);
                } catch (error) {
                    console.error('❌ openInvoice error with slug, trying full URL:', error);
                    // Если не работает со slug, пробуем полный URL
                    if (invoiceLink.startsWith('https://')) {
                        tg.openInvoice(invoiceLink, cb);
                    } else {
                        throw new Error('Invalid invoice format: ' + invoiceLink);
                    }
                }
                return; // Выходим, не показывая обычное подтверждение
            } catch (starsError) {
                console.error('❌ Stars payment error:', starsError);
                purchaseBtn.textContent = originalText;
                purchaseBtn.disabled = false;
                if (tg) {
                    tg.HapticFeedback.notificationOccurred('error');
                    tg.showAlert('Payment with Stars error: ' + starsError.message);
                } else {
                    alert('Payment with Stars error: ' + starsError.message);
                }
                return;
            }
        }
        
        // Для других методов оплаты - валидация обязательна
        purchaseBtn.textContent = 'Validating...';
        
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
            
            // Для других методов оплаты - обычное подтверждение
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
                tg.showAlert('Data validation error: ' + error.message);
            } else {
                alert('Data validation error: ' + error.message);
            }
        }
    });
}

// Setup Stars payment button
function setupStarsButton() {
    const starsBtn = document.getElementById('purchaseStarsBtn');
    
    if (!starsBtn) return;
    
    if (!ENABLE_STARS) {
        starsBtn.style.display = 'none';
        return;
    }
    
    starsBtn.addEventListener('click', async () => {
        const auth = window.telegramAuth;
        
        if (!auth || !auth.isAuthenticated()) {
            alert('Please authorize through Telegram to make a payment');
            if (tg) {
                tg.HapticFeedback.notificationOccurred('error');
            }
            return;
        }
        
        if (!tg || !tg.openInvoice) {
            alert('Payment with Stars is only available inside Telegram');
            return;
        }
        
        const plan = getSelectedPlan();
        if (!plan) {
            alert('Plan not found. Please refresh the page.');
            return;
        }
        
        // Валидация плана
        if (!plan.id && !plan.bundle_name) {
            console.error('[Stars] Plan has no id or bundle_name:', plan);
            alert('Error: plan missing required data. Please refresh the page.');
            return;
        }
        
        const priceValue = getPriceValueFromPlan(plan);
        if (!priceValue || priceValue <= 0) {
            console.error('[Stars] Invalid price value:', priceValue, plan);
            alert('Error: invalid plan price. Please refresh the page.');
            return;
        }
        
        const currency = plan.currency || 'USD';
        const bundleName = plan.bundle_name || plan.id;
        
        if (!bundleName || bundleName.trim() === '') {
            console.error('[Stars] Bundle name is empty:', plan);
            alert('Error: plan bundle name is missing. Please refresh the page.');
            return;
        }
        
        // ✅ ВАЖНО: Вычисляем себестоимость (cost), разделив цену на базовую маржу
        // Цена из API уже содержит базовую маржу (например, 1.29 = +29%)
        // Нам нужно передать в create-invoice именно себестоимость
        const baseMarkup = publicSettings?.markup?.base || publicSettings?.markup?.defaultMultiplier || 1.29;
        const costPrice = priceValue / baseMarkup;
        
        console.log('[Stars] Price calculation:', {
            priceWithMarkup: priceValue,
            baseMarkup: baseMarkup,
            costPrice: costPrice.toFixed(2)
        });
        
        const originalText = starsBtn.textContent;
        starsBtn.textContent = 'Creating invoice...';
        starsBtn.disabled = true;
        
        try {
            const validation = await auth.validateOnServer('/api/validate-telegram');
            if (!validation.valid) {
                throw new Error(validation.error || 'Validation failed');
            }
            
            // ✅ ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ для отладки
            console.log('[Stars] orderData:', {
                type: orderData.type,
                name: orderData.name,
                code: orderData.code,
                planId: orderData.planId,
                planType: orderData.planType
            });
            
            // Для Region и Global используем короткие коды без пробелов
            // ✅ ВАЖНО: Проверяем не только на null/undefined, но и на пустую строку
            let countryCode = (orderData.code && orderData.code.trim() !== '') ? orderData.code.trim() : null;
            console.log('[Stars] Initial countryCode from orderData.code:', countryCode, '(raw:', orderData.code, ')');
            console.log('[Stars] orderData for countryCode generation:', {
                type: orderData.type,
                name: orderData.name,
                code: orderData.code
            });
            
            // ✅ УЛУЧШЕННАЯ ЛОГИКА: Формируем countryCode на основе типа ИЛИ названия
            // Проверяем сначала по country_name (более надежно), потом по type
            const countryName = (orderData.name || '').trim();
            const orderType = (orderData.type || '').toLowerCase();
            
            if ((!countryCode || countryCode.trim() === '') && (orderType === 'global' || countryName.toLowerCase() === 'global')) {
                // Для глобальных планов используем "GLOBAL"
                countryCode = 'GLOBAL';
                console.log('[Stars] Set countryCode to GLOBAL for global plan (type:', orderType, ', name:', countryName, ')');
            } else if ((!countryCode || countryCode.trim() === '') && (orderType === 'region' || countryName)) {
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
                countryCode = regionCodeMap[countryName] || (countryName || 'REGION').replace(/\s+/g, '').toUpperCase();
                console.log('[Stars] Generated countryCode for region:', {
                    regionName: countryName,
                    orderType: orderType,
                    mappedCode: regionCodeMap[countryName],
                    finalCode: countryCode
                });
            }
            
            // ✅ ФИНАЛЬНАЯ ПРОВЕРКА: countryCode должен быть заполнен
            if (!countryCode || countryCode.trim() === '') {
                console.error('[Stars] ❌ countryCode is still empty after generation!', {
                    orderData: orderData,
                    type: orderData.type,
                    name: orderData.name,
                    code: orderData.code,
                    countryName: countryName,
                    orderType: orderType
                });
                throw new Error(`Failed to generate country_code. Type: ${orderData.type}, Name: ${orderData.name}, Code: ${orderData.code}`);
            }
            
            // ✅ ГАРАНТИРУЕМ, что countryCode не пустой (дополнительная проверка)
            countryCode = String(countryCode).trim();
            if (countryCode === '') {
                throw new Error('country_code cannot be empty after processing');
            }
            
            console.log('[Stars] Final countryCode:', countryCode);
            
            // Валидация всех обязательных полей перед отправкой
            if (!plan.id) {
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
            
            // ✅ ГАРАНТИРУЕМ, что countryCode не потерялся перед созданием payload
            if (!countryCode || countryCode.trim() === '') {
                console.error('[Stars] ❌ countryCode is empty before creating payload!', {
                    countryCode: countryCode,
                    orderData: orderData,
                    plan: plan
                });
                throw new Error('country_code is empty before creating request payload');
            }
            
            // ✅ КРИТИЧЕСКАЯ ПРОВЕРКА: Если countryCode все еще пустой, устанавливаем его принудительно
            if (!countryCode || countryCode.trim() === '') {
                console.warn('[Stars] ⚠️ countryCode is empty, forcing generation from orderData:', orderData);
                
                // Принудительно формируем countryCode на основе country_name или type
                if (orderData.name) {
                    const name = String(orderData.name).trim();
                    if (name.toLowerCase() === 'global') {
                        countryCode = 'GLOBAL';
                    } else {
                        // Маппинг регионов
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
                        countryCode = regionCodeMap[name] || name.replace(/\s+/g, '').toUpperCase();
                    }
                } else if (orderData.type === 'global') {
                    countryCode = 'GLOBAL';
                } else if (orderData.type === 'region') {
                    countryCode = 'REGION';
                } else {
                    countryCode = 'UNKNOWN';
                }
                
                console.log('[Stars] Forced countryCode generation:', countryCode);
            }
            
            // ✅ ГАРАНТИРУЕМ, что countryCode не пустой
            countryCode = String(countryCode || 'UNKNOWN').trim();
            if (countryCode === '' || countryCode === 'null' || countryCode === 'undefined') {
                countryCode = orderData.type === 'global' ? 'GLOBAL' : (orderData.type === 'region' ? 'REGION' : 'UNKNOWN');
                console.warn('[Stars] ⚠️ countryCode was invalid, set to:', countryCode);
            }
            
            const requestPayload = {
                plan_id: plan.id || plan.bundle_name || orderData.planId,
                plan_type: orderData.planType,
                bundle_name: bundleName,
                country_code: countryCode, // ✅ Уже гарантированно не пустой
                country_name: orderData.name || (orderData.type === 'global' ? 'Global' : orderData.name || ''),
                price: costPrice, // ✅ Передаем СЕБЕСТОИМОСТЬ, а не цену с маржой!
                currency,
                telegram_user_id: auth.getUserId(),
                telegram_username: auth.getUsername()
            };
            
            // ✅ ФИНАЛЬНАЯ ПРОВЕРКА после создания payload
            if (!requestPayload.country_code || requestPayload.country_code.trim() === '' || requestPayload.country_code === 'null') {
                console.error('[Stars] ❌ country_code is STILL empty in payload!', {
                    requestPayload: requestPayload,
                    countryCode: countryCode,
                    orderData: orderData
                });
                // Принудительно устанавливаем значение
                requestPayload.country_code = orderData.type === 'global' ? 'GLOBAL' : (orderData.type === 'region' ? 'REGION' : 'UNKNOWN');
                console.warn('[Stars] ⚠️ Forced country_code to:', requestPayload.country_code);
            }
            
            // ✅ ФИНАЛЬНАЯ ПРОВЕРКА перед отправкой
            console.log('[Stars] ========================================');
            console.log('[Stars] Final payment request payload:', JSON.stringify(requestPayload, null, 2));
            console.log('[Stars] Plan object:', {
                id: plan.id,
                bundle_name: plan.bundle_name,
                price: plan.price,
                priceValue: plan.priceValue
            });
            console.log('[Stars] orderData:', orderData);
            console.log('[Stars] ========================================');
            
            // Дополнительная проверка всех полей
            if (!requestPayload.plan_id || requestPayload.plan_id.trim() === '') {
                throw new Error(`plan_id is empty. Plan: ${JSON.stringify(plan)}, orderData.planId: ${orderData.planId}`);
            }
            if (!requestPayload.bundle_name || requestPayload.bundle_name.trim() === '') {
                throw new Error(`bundle_name is empty. Plan: ${JSON.stringify(plan)}`);
            }
            if (!requestPayload.country_code || requestPayload.country_code.trim() === '') {
                throw new Error(`country_code is empty. orderData: ${JSON.stringify(orderData)}`);
            }
            if (!requestPayload.price || requestPayload.price <= 0) {
                throw new Error(`price is invalid: ${requestPayload.price}. costPrice: ${costPrice}, plan: ${JSON.stringify(plan)}`);
            }
            
            // Создаем AbortController для таймаута (30 секунд)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            let response;
            try {
                response = await fetch('/api/telegram/stars/create-invoice', {
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
            
            const result = await response.json();
            if (!result.success || !result.invoiceLink) {
                throw new Error(result.error || 'Failed to create invoice');
            }
            
            const invoiceLink = result.invoiceLink;
            const slug = invoiceLink.split('/').pop();
            
            const cb = (status) => {
                console.log('💫 Invoice status callback received:', status);
                if (status === 'paid') {
                    // Успешная оплата - заказ будет создан через webhook
                    console.log('✅ Payment successful! Redirecting to My eSIMs...');
                    if (tg) {
                        tg.HapticFeedback.notificationOccurred('success');
                        tg.showAlert('✅ Payment successful! Your eSIM will be sent to you shortly.');
                    }
                    // Редирект на страницу My eSIMs после успешной оплаты
                    setTimeout(() => {
                        console.log('🔄 Redirecting to my-esims.html...');
                        window.location.href = 'my-esims.html';
                    }, 2000);
                } else if (status === 'cancelled') {
                    // Пользователь отменил оплату
                    if (tg) {
                        tg.HapticFeedback.notificationOccurred('error');
                    }
                    // Показываем собственное модальное окно с кнопкой "Close" на английском
                    showCustomAlert('Payment cancelled.');
                } else if (status === 'failed') {
                    // Ошибка оплаты
                    if (tg) {
                        tg.HapticFeedback.notificationOccurred('error');
                    }
                    // Показываем собственное модальное окно с кнопкой "Close" на английском
                    showCustomAlert('Payment failed. Please try again.');
                } else if (status === 'pending') {
                    // Платеж в обработке
                    console.log('Payment is pending...');
                }
            };
            
            tg.openInvoice(slug, cb);
        } catch (error) {
            console.error('❌ Stars payment error:', error);
            if (tg) {
                tg.showAlert('Payment with Stars failed: ' + error.message);
            } else {
                alert('Payment with Stars failed: ' + error.message);
            }
        } finally {
            starsBtn.textContent = originalText;
            starsBtn.disabled = false;
        }
    });
}

// Setup bottom navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    console.log('🔵 Setting up navigation, found items:', navItems.length);
    
    navItems.forEach((item, index) => {
        const label = item.querySelector('.nav-label')?.textContent;
        console.log(`🔵 Setting up nav item ${index}: ${label}`);
        
        item.addEventListener('click', (e) => {
            console.log('🔵 Nav item clicked:', label);
            e.preventDefault();
            e.stopPropagation();
            
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            
            if (label === 'Account') {
                window.location.href = 'account.html';
            } else if (label === 'Buy eSIM') {
                window.location.href = 'index.html';
            } else if (label === 'Help') {
                window.location.href = 'help.html';
            }
        });
    });
    
    console.log('✅ Navigation setup complete');
}
