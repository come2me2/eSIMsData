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
    if (tg.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            tg.HapticFeedback.impactOccurred('light');
            // Возвращаемся на главную (Local), чтобы появился "Закрыть"
            window.location.href = 'index.html?segment=local';
        });
    }
}

// Global plans - supported in 105 countries
const globalCountries = [
    'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia',
    'Austria', 'Bahrain', 'Bangladesh', 'Belgium', 'Bolivia',
    'Bosnia and Herzegovina', 'Brazil', 'Bulgaria', 'Cambodia', 'Canada',
    'Chile', 'China', 'Colombia', 'Costa Rica', 'Croatia',
    'Cyprus', 'Czech Republic', 'Denmark', 'Dominican Republic', 'Ecuador',
    'Egypt', 'Estonia', 'Finland', 'France', 'Georgia',
    'Germany', 'Greece', 'Guatemala', 'Honduras', 'Hong Kong',
    'Hungary', 'Iceland', 'India', 'Indonesia', 'Ireland',
    'Israel', 'Italy', 'Japan', 'Jordan', 'Kazakhstan',
    'Kenya', 'Kuwait', 'Latvia', 'Lithuania', 'Luxembourg',
    'Malaysia', 'Malta', 'Mexico', 'Morocco', 'Netherlands',
    'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Panama',
    'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
    'Romania', 'Russia', 'Saudi Arabia', 'Singapore', 'Slovakia',
    'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sweden',
    'Switzerland', 'Taiwan', 'Thailand', 'Turkey', 'Ukraine',
    'United Arab Emirates', 'China', 'United States', 'Uruguay', 'Venezuela',
    'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe', 'Angola',
    'Armenia', 'Azerbaijan', 'Belarus', 'Botswana', 'Brunei',
    'Chad', 'Congo', 'Cuba', 'Ethiopia', 'Fiji',
    'Ghana', 'Haiti', 'Iraq', 'Jamaica', 'Kyrgyzstan',
    'Laos', 'Lebanon', 'Madagascar', 'Maldives', 'Mongolia',
    'Myanmar', 'Nepal', 'Oman', 'Papua New Guinea', 'Paraguay',
    'Rwanda', 'Samoa', 'Senegal', 'Sri Lanka', 'Tanzania',
    'Tunisia', 'Uzbekistan', 'Vanuatu'
];

// Plans data - загружаются динамически из API
let standardPlans = [];
let unlimitedPlans = [];
let plansLoaded = false;

let currentPlanType = 'standard';
let selectedPlanId = null; // Будет установлен после загрузки планов

// Загрузка реальных планов из API
async function loadGlobalPlans() {
    try {
        console.log('🔵 Loading global plans...');
        
        let data = null;
        
        // Пробуем загрузить через DataLoader
        // DataLoader теперь всегда использует API для получения актуальных данных с правильной наценкой
        if (window.DataLoader && typeof window.DataLoader.loadGlobalPlans === 'function') {
            try {
                console.log('⚡ Trying DataLoader.loadGlobalPlans...');
                const dataLoaderResult = await window.DataLoader.loadGlobalPlans();
                if (dataLoaderResult) {
                    // DataLoader может вернуть данные напрямую или обернутые в объект
                    const loadedData = dataLoaderResult.data || dataLoaderResult;
                    
                    if (loadedData && loadedData.standard && loadedData.standard.length > 0) {
                        const firstPlan = loadedData.standard[0];
                        console.log('✅ DataLoader returned:', {
                            bundle_name: firstPlan.bundle_name,
                            priceValue: firstPlan.priceValue,
                            price: firstPlan.price,
                            source: 'API (with markup)'
                        });
                        data = loadedData;
                    } else {
                        data = loadedData;
                        console.log('✅ Data loaded via DataLoader');
                    }
                }
            } catch (e) {
                console.warn('⚠️ DataLoader failed:', e.message);
            }
        } else {
            console.log('⚠️ DataLoader not available');
        }
        
        // Fallback: direct API (всегда используем, если DataLoader вернул неправильные данные)
        if (!data) {
            try {
                console.log('🔄 Trying direct API...');
                const apiUrl = '/api/esimgo/plans?category=global';
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}: ${response.statusText}`);
                }
                const result = await response.json();
                if (result.success && result.data) {
                    data = result.data;
                    console.log('✅ Data loaded via API');
                    
                    // Проверяем цену из API
                    if (data.standard && data.standard.length > 0) {
                        const firstPlan = data.standard[0];
                        console.log('🔍 API returned:', {
                            bundle_name: firstPlan.bundle_name,
                            priceValue: firstPlan.priceValue,
                            price: firstPlan.price
                        });
                    }
                } else {
                    console.warn('⚠️ API response unsuccessful:', result);
                }
            } catch (e) {
                console.error('❌ API fetch failed:', e.message);
            }
        }
        
        if (data) {
            standardPlans = data.standard || [];
            unlimitedPlans = data.unlimited || [];
            
            // КРИТИЧЕСКАЯ ПРОВЕРКА: логируем цены для отладки
            if (standardPlans.length > 0) {
                const firstPlan = standardPlans[0];
                console.log('🔍 First plan data:', {
                    bundle_name: firstPlan.bundle_name,
                    priceValue: firstPlan.priceValue,
                    price: firstPlan.price,
                    data: firstPlan.data
                });
                // Проверяем, не является ли цена слишком высокой (признак двойной наценки)
                if (firstPlan.priceValue && firstPlan.priceValue > 20) {
                    console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА: Цена слишком высокая!', {
                        bundle_name: firstPlan.bundle_name,
                        priceValue: firstPlan.priceValue,
                        expectedPrice: '~$10.40 for 1GB'
                    });
                }
            }
            
            // Сортируем unlimited планы по duration и data для консистентности
            if (unlimitedPlans.length > 0) {
                unlimitedPlans.sort((a, b) => {
                    const durationA = parseInt(a.duration?.match(/\d+/)?.[0] || '0');
                    const durationB = parseInt(b.duration?.match(/\d+/)?.[0] || '0');
                    if (durationA !== durationB) {
                        return durationA - durationB;
                    }
                    const dataA = parseInt(a.data?.match(/\d+/)?.[0] || '0');
                    const dataB = parseInt(b.data?.match(/\d+/)?.[0] || '0');
                    return dataA - dataB;
                });
            }
            
            plansLoaded = true;
            
            // Устанавливаем первый план как выбранный по умолчанию
            if (standardPlans.length > 0) {
                selectedPlanId = standardPlans[0].id || standardPlans[0].bundle_name;
            } else if (unlimitedPlans.length > 0) {
                selectedPlanId = unlimitedPlans[0].id || unlimitedPlans[0].bundle_name;
            }
            
            console.log('✅ Global plans loaded:', {
                standard: standardPlans.length,
                unlimited: unlimitedPlans.length,
                selectedPlanId: selectedPlanId
            });
            
            // Обновляем отображение
            renderPlans();
            updateInfoBox();
        } else {
            console.error('❌ No global plans data received from any source');
            const plansList = document.getElementById('plansList');
            if (plansList) {
                plansList.innerHTML = '<div class="no-plans">Failed to load plans. Please refresh the page.</div>';
            }
        }
    } catch (error) {
        console.error('❌ Error loading global plans:', error);
        const plansList = document.getElementById('plansList');
        if (plansList) {
            plansList.innerHTML = '<div class="no-plans">Error loading plans. Please refresh the page.</div>';
        }
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    setupMainSegmentedControl();
    setupSegmentedControl();
    setupCountriesList();
    setupNavigation();
    
    // Убеждаемся, что нижнее меню всегда видно
    ensureBottomNavVisible();
    setTimeout(ensureBottomNavVisible, 100);
    setTimeout(ensureBottomNavVisible, 300);
    
    // Загружаем планы
    await loadGlobalPlans();
    
    // Рендерим планы после загрузки
    renderPlans();
    updateInfoBox();
    setupNextButton();
});

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

// Setup main segmented control (Region, Local, Global)
function setupMainSegmentedControl() {
    const segmentButtons = document.querySelectorAll('.segmented-control:not(.plans-segmented) .segment-btn');
    
    segmentButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const segment = btn.dataset.segment;
            
            if (segment === 'region') {
                window.location.href = 'index.html?segment=region';
            } else if (segment === 'local') {
                window.location.href = 'index.html?segment=local';
            } else if (segment === 'global') {
                // Already on global page
                return;
            }
        });
    });
}

// Setup segmented control for plan type
function setupSegmentedControl() {
    const segmentButtons = document.querySelectorAll('.plans-segmented .segment-btn');
    
    segmentButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            segmentButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            
            currentPlanType = btn.dataset.planType;
            
            // Устанавливаем первый план как выбранный по умолчанию
            const plans = currentPlanType === 'standard' ? standardPlans : unlimitedPlans;
            if (plans.length > 0) {
                selectedPlanId = plans[0].id || plans[0].bundle_name;
            } else {
                selectedPlanId = null;
            }
            
            renderPlans();
            updateInfoBox();
        });
    });
}

// Render plans list
function renderPlans() {
    const plansList = document.getElementById('plansList');
    if (!plansList) return;
    
    plansList.innerHTML = '';
    
    const plans = currentPlanType === 'standard' ? standardPlans : unlimitedPlans;
    
    if (plans.length === 0) {
        plansList.innerHTML = '<div class="no-plans">Loading plans...</div>';
        return;
    }
    
    plans.forEach(plan => {
        // Определяем ID плана (может быть id или bundle_name)
        const planId = plan.id || plan.bundle_name;
        const isSelected = selectedPlanId === planId || selectedPlanId === plan.id || selectedPlanId === plan.bundle_name;
        
        const planItem = document.createElement('div');
        planItem.className = `plan-item ${isSelected ? 'selected' : ''}`;
        planItem.dataset.planId = planId;
        
        // Определяем цену (приоритет: priceValue > price > fallback)
        // ВАЖНО: priceValue - это число, price - это строка типа "$ 10.40"
        // Используем priceValue, так как это актуальная цена из API
        let price = plan.priceValue;
        
        // Если priceValue отсутствует, пытаемся извлечь из строки price
        if (!price && plan.price) {
            const priceMatch = String(plan.price).match(/[\d.]+/);
            if (priceMatch) {
                price = parseFloat(priceMatch[0]);
            }
        }
        
        // Fallback
        if (!price || isNaN(price)) {
            price = 9.99;
        }
        
        // КРИТИЧЕСКАЯ ПРОВЕРКА: если цена > 20 для 1GB, это ошибка
        if (price > 20 && plan.data && plan.data.includes('1 GB')) {
            console.error('🚨 КРИТИЧЕСКАЯ ОШИБКА: Неправильная цена для 1GB!', {
                bundle_name: plan.bundle_name,
                priceValue: plan.priceValue,
                price: plan.price,
                extractedPrice: price,
                data: plan.data
            });
        }
        
        planItem.innerHTML = `
            <div class="plan-info">
                <div class="plan-data">${plan.data}</div>
                <div class="plan-duration">${plan.duration}</div>
            </div>
            <div class="plan-right">
                <div class="plan-price">${formatPrice(price)}</div>
                <div class="radio-button ${isSelected ? 'selected' : ''}">
                    ${isSelected ? 
                        '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="5" fill="currentColor"/></svg>' : 
                        ''
                    }
                </div>
            </div>
        `;
        
        planItem.addEventListener('click', () => {
            selectPlan(planId);
        });
        
        plansList.appendChild(planItem);
    });
}

// Format price with dollar sign
function formatPrice(price) {
    if (!price) return '$ 9.99';
    
    // Если цена уже содержит символ $, возвращаем как есть
    if (typeof price === 'string' && price.includes('$')) {
        return price;
    }
    
    // Если цена - число или строка с числом, добавляем символ $
    const priceNum = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : price;
    if (!isNaN(priceNum)) {
        return `$ ${priceNum.toFixed(2)}`;
    }
    
    // Fallback
    return `$ ${price}`;
}

// Select plan
function selectPlan(planId) {
    selectedPlanId = planId;
    renderPlans();
    updateInfoBox();
    
    if (tg) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// Update info box visibility
function updateInfoBox() {
    const infoBox = document.getElementById('infoBox');
    if (infoBox) {
        infoBox.style.display = currentPlanType === 'unlimited' ? 'flex' : 'none';
    }
}

// Setup countries list toggle
function setupCountriesList() {
    const banner = document.getElementById('globalInfoBanner');
    const chevron = document.getElementById('globalInfoChevron');
    const container = document.getElementById('countriesListContainer');
    const countriesList = document.getElementById('countriesList');
    let isExpanded = false;
    
    if (!banner || !chevron || !container || !countriesList) return;
    
    // Render countries list
    globalCountries.forEach(countryName => {
        const countryItem = document.createElement('div');
        countryItem.className = 'country-item-small';
        countryItem.textContent = countryName;
        countriesList.appendChild(countryItem);
    });
    
    banner.addEventListener('click', () => {
        isExpanded = !isExpanded;
        
        if (isExpanded) {
            container.style.display = 'block';
            chevron.style.transform = 'rotate(180deg)';
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            // Scroll to the banner to show the top of the countries list
            setTimeout(() => {
                banner.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } else {
            container.style.display = 'none';
            chevron.style.transform = 'rotate(0deg)';
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
        }
    });
}

// Setup next button
function setupNextButton() {
    const nextBtn = document.getElementById('nextBtn');
    if (!nextBtn) {
        console.error('❌ Next button not found');
        return;
    }
    
    nextBtn.addEventListener('click', () => {
        if (!selectedPlanId) {
            if (tg) {
                tg.showAlert('Please select a plan');
            } else {
                alert('Please select a plan');
            }
            return;
        }
        
        if (tg) {
            tg.HapticFeedback.impactOccurred('medium');
        }
        
        // Navigate to checkout screen
        const params = new URLSearchParams({
            type: 'global',
            name: 'Global',
            plan: selectedPlanId,
            planType: currentPlanType
        });
        window.location.href = `checkout.html?${params.toString()}`;
    });
}
