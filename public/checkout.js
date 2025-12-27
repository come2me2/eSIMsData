// Telegram Web App initialization
let tg = window.Telegram.WebApp;

// 🔧 Флаг режима разработки - деактивирует кнопку Purchase
const DEV_MODE = true; // Установите false для активации покупок
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
        purchaseBtn.textContent = testMode ? 'Validating order...' : 'Creating order...';
        const orderResponse = await fetch('/api/esimgo/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bundle_name: bundleName,
                telegram_user_id: orderWithUser.telegram_user_id,
                telegram_username: orderWithUser.telegram_username,
                user_name: orderWithUser.user_name,
                country_code: orderWithUser.code,
                country_name: orderWithUser.name,
                plan_id: orderWithUser.planId,
                plan_type: orderWithUser.planType,
                test_mode: testMode // Передаем режим тестирования
            })
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
const FLAG_VERSION = 'v8'; // Updated: fix flag styling (rounded corners, proper sizing)

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
    
    const selectedPlan = plans.find(p => p.id === orderData.planId) || plans[0];
    
    if (selectedPlan) {
        planDetailsElement.innerHTML = `
            <span class="checkout-plan-amount">${selectedPlan.data}</span>
            <span class="checkout-plan-duration">${selectedPlan.duration}</span>
        `;
        
        // Store original price (используем реальную цену из API или fallback)
        originalPrice = selectedPlan.price || '$ 9.99';
        
        // Извлекаем числовое значение цены (БЕЗ наценки способа оплаты)
        // Цена из API уже содержит базовую наценку, но не содержит наценку способа оплаты
        const priceMatch = originalPrice.match(/\$?\s*([\d.]+)/);
        originalPriceValue = priceMatch ? parseFloat(priceMatch[1]) : 0;
        
        console.log('Setup order details with plan:', {
            planId: orderData.planId,
            selectedPlan: selectedPlan,
            price: originalPrice,
            priceValue: originalPriceValue
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
    const selectedPlan = plans.find(p => p.id === orderData.planId) || plans[0];
    
    if (selectedPlan) {
        // Обновляем детали плана
        planDetailsElement.innerHTML = `
            <span class="checkout-plan-amount">${selectedPlan.data}</span>
            <span class="checkout-plan-duration">${selectedPlan.duration}</span>
        `;
        
        // Обновляем цену
        originalPrice = selectedPlan.price || '$ 9.99';
        
        // Извлекаем числовое значение цены
        const priceMatch = originalPrice.match(/\$?\s*([\d.]+)/);
        originalPriceValue = priceMatch ? parseFloat(priceMatch[1]) : 0;
        
        updateTotalPrice();
        
        console.log('Order details updated with real plan:', {
            plan: selectedPlan.data,
            duration: selectedPlan.duration,
            price: selectedPlan.price
        });
    }
}

function getSelectedPlan() {
    const plans = orderData.planType === 'unlimited' ? unlimitedPlans : standardPlans;
    return plans.find(p => p.id === orderData.planId) || plans[0];
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
        if (data.success && data.settings) {
            publicSettings = data.settings;
            console.log('✅ Public settings loaded:', publicSettings);
        }
    } catch (error) {
        console.error('Error loading public settings:', error);
    }
    return publicSettings;
}

function updateTotalPrice() {
    const totalPriceElement = document.getElementById('checkoutTotalPrice');
    
    // Используем базовую цену (БЕЗ наценки способа оплаты)
    let basePrice = originalPriceValue || 0;
    
    // Если базовой цены нет, пытаемся извлечь из строки
    if (basePrice === 0) {
        const priceMatch = originalPrice.match(/\$?\s*([\d.]+)/);
        if (priceMatch) {
            basePrice = parseFloat(priceMatch[1]);
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
    if (isPromoApplied && discountPercent > 0) {
        basePrice = basePrice * (1 - discountPercent / 100);
    }
    
    // Обновляем отображение
    totalPriceElement.textContent = `$ ${basePrice.toFixed(2)}`;

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
    
    // Valid promo codes with discounts
    const promoCodes = {
        'PROMO': 30  // 30% discount
    };
    
    if (promoBtn && promoInput && promoError && promoSuccess) {
        promoBtn.addEventListener('click', (e) => {
            console.log('🔵 Promo button clicked', e);
            e.preventDefault();
            e.stopPropagation();
            const promoCode = promoInput.value.trim().toUpperCase();
            
            if (!promoCode) {
                promoError.style.display = 'none';
                promoSuccess.style.display = 'none';
                return;
            }
            
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            
            // Check if promo code is valid
            if (promoCodes.hasOwnProperty(promoCode)) {
                // Valid promo code
                isPromoApplied = true;
                discountPercent = promoCodes[promoCode];
                
                promoError.style.display = 'none';
                promoSuccess.style.display = 'block';
                promoInput.style.borderColor = 'transparent';
                
                // Update price with discount
                updateTotalPrice();
                
                if (tg) {
                    tg.HapticFeedback.notificationOccurred('success');
                }
            } else {
                // Invalid promo code
                isPromoApplied = false;
                discountPercent = 0;
                
                promoError.style.display = 'block';
                promoSuccess.style.display = 'none';
                promoInput.style.borderColor = '#FF3B30';
                
                // Reset price to original
                updateTotalPrice();
                
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
                    updateTotalPrice();
                }
            }
        });
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
            alert('Пожалуйста, авторизуйтесь через Telegram для оформления заказа');
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
            alert('Пожалуйста, авторизуйтесь через Telegram для оплаты');
            if (tg) {
                tg.HapticFeedback.notificationOccurred('error');
            }
            return;
        }
        
        if (!tg || !tg.openInvoice) {
            alert('Оплата через Stars доступна только внутри Telegram');
            return;
        }
        
        const plan = getSelectedPlan();
        if (!plan) {
            alert('План не найден. Обновите страницу.');
            return;
        }
        
        const priceValue = getPriceValueFromPlan(plan);
        const currency = plan.currency || 'USD';
        const bundleName = plan.bundle_name || plan.id;
        
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
            
            const response = await fetch('/api/telegram/stars/create-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plan_id: plan.id,
                    plan_type: orderData.planType,
                    bundle_name: bundleName,
                    country_code: orderData.code,
                    country_name: orderData.name,
                    price: costPrice, // ✅ Передаем СЕБЕСТОИМОСТЬ, а не цену с маржой!
                    currency,
                    telegram_user_id: auth.getUserId(),
                    telegram_username: auth.getUsername()
                })
            });
            
            const result = await response.json();
            if (!result.success || !result.invoiceLink) {
                throw new Error(result.error || 'Не удалось создать счёт');
            }
            
            const invoiceLink = result.invoiceLink;
            const slug = invoiceLink.split('/').pop();
            
            const cb = (status) => {
                console.log('Invoice status:', status);
                if (status === 'paid') {
                    tg.showAlert('Оплата принята. eSIM будет выдана в чат после обработки заказа.');
                } else if (status === 'cancelled') {
                    tg.showAlert('Оплата отменена.');
                }
            };
            
            tg.openInvoice(slug, cb);
        } catch (error) {
            console.error('❌ Stars payment error:', error);
            if (tg) {
                tg.showAlert('Оплата через Stars не удалась: ' + error.message);
            } else {
                alert('Оплата через Stars не удалась: ' + error.message);
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
