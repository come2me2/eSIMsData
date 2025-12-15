// Telegram Web App initialization
let tg = window.Telegram.WebApp;

// 🔧 Флаг режима разработки - деактивирует кнопку Purchase
const DEV_MODE = true; // Установите false для активации покупок

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
let isPromoApplied = false;
let discountPercent = 0;

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
    
    setupOrderDetails();
    setupPromoCode();
    setupPurchaseButton();
    
    // Если планы загрузились, обновляем отображение
    if (plansLoaded && (standardPlans.length > 0 || unlimitedPlans.length > 0)) {
        updateOrderDetailsWithRealPlans();
    }
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
    const selectedPlan = plans.find(p => p.id === orderData.planId) || plans[0];
    
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
    
    if (isPromoApplied && discountPercent > 0) {
        // Extract numeric value from price string (e.g., "$ 9.99" -> 9.99)
        const priceMatch = originalPrice.match(/\$?\s*([\d.]+)/);
        if (priceMatch) {
            const originalPriceValue = parseFloat(priceMatch[1]);
            const discountedPrice = originalPriceValue * (1 - discountPercent / 100);
            totalPriceElement.textContent = `$ ${discountedPrice.toFixed(2)}`;
        } else {
            totalPriceElement.textContent = originalPrice;
        }
    } else {
        totalPriceElement.textContent = originalPrice;
    }
}

// Setup promo code
function setupPromoCode() {
    const promoBtn = document.getElementById('promoBtn');
    const promoInput = document.getElementById('promoInput');
    const promoError = document.getElementById('promoError');
    const promoSuccess = document.getElementById('promoSuccess');
    
    // Valid promo codes with discounts
    const promoCodes = {
        'PROMO': 30  // 30% discount
    };
    
    if (promoBtn && promoInput && promoError && promoSuccess) {
        promoBtn.addEventListener('click', () => {
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
