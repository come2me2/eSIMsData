// Telegram Web App initialization
let tg = window.Telegram.WebApp;

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

// Plans data (same as in other files)
const standardPlans = [
    { data: '1 GB', duration: '7 Days', price: '$ 9.99', id: 'plan1' },
    { data: '2 GB', duration: '7 Days', price: '$ 9.99', id: 'plan2' },
    { data: '3 GB', duration: '30 Days', price: '$ 9.99', id: 'plan3' },
    { data: '5 GB', duration: '30 Days', price: '$ 9.99', id: 'plan4' }
];

const unlimitedPlans = [
    { data: '∞ GB', duration: '7 Days', price: '$ 9.99', id: 'unlimited1' },
    { data: '∞ GB', duration: '7 Days', price: '$ 9.99', id: 'unlimited2' },
    { data: '∞ GB', duration: '30 Days', price: '$ 9.99', id: 'unlimited3' },
    { data: '∞ GB', duration: '30 Days', price: '$ 9.99', id: 'unlimited4' }
];

// Store original price and discount state
let originalPrice = '';
let isPromoApplied = false;
let discountPercent = 0;

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

// Function to get flag image URL from local flags folder
function getFlagPath(countryCode) {
    if (!countryCode) {
        return null;
    }
    // Файлы в верхнем регистре: AF.svg, TH.svg и т.д.
    const code = countryCode.toUpperCase();
    return `/flags/${code}.svg`;
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
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
    
    setupOrderDetails();
    setupPromoCode();
    setupPurchaseButton();
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
    const selectedPlan = plans.find(p => p.id === orderData.planId) || plans[0];
    
    planDetailsElement.innerHTML = `
        <span class="checkout-plan-amount">${selectedPlan.data}</span>
        <span class="checkout-plan-duration">${selectedPlan.duration}</span>
    `;
    
    // Store original price
    originalPrice = selectedPlan.price;
    
    // Update total price
    updateTotalPrice();
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
            const newPrice = `$ ${discountedPrice.toFixed(2)}`;
            
            totalPriceElement.innerHTML = `
                <span class="checkout-total-price-old">${originalPrice}</span>
                <span class="checkout-total-price-new">${newPrice}</span>
            `;
        }
    } else {
        totalPriceElement.textContent = originalPrice;
    }
}

// Setup promo code button
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
    document.getElementById('purchaseBtn').addEventListener('click', async () => {
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
                        // Отправка заказа на сервер с initData для повторной проверки
                        try {
                            // const result = await auth.secureRequest('/api/orders', orderWithUser);
                            // console.log('Order created:', result);
                            console.log('Payment confirmed for validated user:', auth.getUserId());
                            
                            if (tg) {
                                tg.HapticFeedback.notificationOccurred('success');
                            }
                        } catch (error) {
                            console.error('Order creation failed:', error);
                            if (tg) {
                                tg.showAlert('Order failed: ' + error.message);
                            }
                        }
                    }
                });
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

