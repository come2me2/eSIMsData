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
    // При возврате назад переходим на Local страницу (главная)
    if (tg.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            tg.HapticFeedback.impactOccurred('light');
            // Переходим на Local страницу (главная страница)
            window.location.href = 'local-countries.html';
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

// Функция для обновления счетчика стран
function updateGlobalCountriesCount(count) {
    const infoTextElement = document.getElementById('globalInfoText');
    if (infoTextElement) {
        infoTextElement.textContent = `Supported in countries: ${count}`;
    }
}

// Функция загрузки планов из API (глобальные планы - без фильтров)
async function loadPlansFromAPI() {
    console.log('🔵 loadPlansFromAPI called for global plans');
    
    // Проверяем клиентский кэш (localStorage)
    const cacheKey = 'global_plans_cache';
    const cacheTimestampKey = 'global_plans_cache_timestamp';
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа
    
    try {
        // Пытаемся загрузить из кэша
        const cachedData = localStorage.getItem(cacheKey);
        const cacheTimestamp = localStorage.getItem(cacheTimestampKey);
        
        if (cachedData && cacheTimestamp) {
            const cacheAge = Date.now() - parseInt(cacheTimestamp);
            if (cacheAge < CACHE_TTL) {
                console.log('✅ Loading global plans from localStorage cache');
                const result = JSON.parse(cachedData);
                
                // Используем данные из кэша
                if (result.success && result.data) {
                    standardPlans = result.data.standard || [];
                    unlimitedPlans = result.data.unlimited || [];
                    
                    // Обновляем список стран
                    if (result.data.countries && Array.isArray(result.data.countries)) {
                        const apiCountries = result.data.countries.map(c => c.name || c.code);
                        if (apiCountries.length > 0) {
                            globalCountries.length = 0;
                            globalCountries.push(...apiCountries);
                            updateGlobalCountriesCount(apiCountries.length);
                        }
                    }
                    
                    // Добавляем ID для совместимости
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
                    
                    console.log('✅ Global plans loaded from cache:', {
                        standard: standardPlans.length,
                        unlimited: unlimitedPlans.length
                    });
                    
                    return true;
                }
            } else {
                console.log('⚠️ Cache expired, fetching fresh data');
                localStorage.removeItem(cacheKey);
                localStorage.removeItem(cacheTimestampKey);
            }
        }
    } catch (cacheError) {
        console.warn('⚠️ Error reading from cache:', cacheError);
    }
    
    try {
        // Для глобальных планов передаем параметр category=global для загрузки из API
        const apiUrl = `/api/esimgo/plans?category=global`;
        console.log('🔵 Fetching global plans from API:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('🔵 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error Response:', errorText);
            throw new Error(`API returned ${response.status}: ${errorText.substring(0, 100)}`);
        }
        
        const result = await response.json();
        console.log('🔵 API response:', result);
        
        // Сохраняем в кэш
        try {
            localStorage.setItem(cacheKey, JSON.stringify(result));
            localStorage.setItem(cacheTimestampKey, Date.now().toString());
            console.log('✅ Global plans saved to localStorage cache');
        } catch (cacheError) {
            console.warn('⚠️ Error saving to cache:', cacheError);
        }
        
        if (result.success && result.data) {
            standardPlans = result.data.standard || [];
            unlimitedPlans = result.data.unlimited || [];
            
            // Обновляем список стран из API ответа
            if (result.data.countries && Array.isArray(result.data.countries)) {
                const apiCountries = result.data.countries.map(c => c.name || c.code);
                if (apiCountries.length > 0) {
                    // Очищаем старый список и заменяем на новый из API
                    globalCountries.length = 0;
                    globalCountries.push(...apiCountries);
                    console.log(`✅ Updated global countries list from API:`, apiCountries.length, 'countries');
                    
                    // Обновляем счетчик стран в UI
                    updateGlobalCountriesCount(apiCountries.length);
                }
            }
            
            // Добавляем ID для совместимости
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
            
            console.log('Global plans loaded from API:', {
                standard: standardPlans.length,
                unlimited: unlimitedPlans.length,
                countriesCount: result.data.countries?.length || 0,
                sampleStandard: standardPlans[0] || null,
                sampleUnlimited: unlimitedPlans[0] || null
            });
            
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

let currentPlanType = 'standard';
let selectedPlanId = 'plan2'; // Default selected for standard

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    setupMainSegmentedControl();
    setupSegmentedControl();
    
    // Загружаем реальные глобальные планы из API
    console.log('🔵 Loading global plans from API');
    const loaded = await loadPlansFromAPI();
    
    if (loaded) {
        console.log('✅ Plans loaded successfully, rendering...');
        console.log('Standard plans count:', standardPlans.length);
        console.log('Unlimited plans count:', unlimitedPlans.length);
        if (standardPlans.length > 0) {
            console.log('First standard plan after load:', standardPlans[0]);
        }
    } else {
        console.warn('⚠️ Plans loading failed or returned false, using fallback');
        if (standardPlans.length > 0) {
            console.log('First standard plan (fallback):', standardPlans[0]);
        }
    }
    
    // Рендерим планы после загрузки (или fallback)
    renderPlans();
    updateInfoBox();
    setupNextButton();
    setupCountriesList();
    
    // Обновляем счетчик стран из актуального массива globalCountries
    // Это нужно на случай, если данные уже загружены или есть fallback
    if (globalCountries.length > 0) {
        updateGlobalCountriesCount(globalCountries.length);
    }
});

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
            selectedPlanId = currentPlanType === 'unlimited' ? 'unlimited2' : 'plan2'; // Set default selection
            renderPlans();
            updateInfoBox();
        });
    });
}

// Render plans list
function renderPlans() {
    const plansList = document.getElementById('plansList');
    plansList.innerHTML = '';
    
    const plans = currentPlanType === 'standard' ? standardPlans : unlimitedPlans;
    
    plans.forEach(plan => {
        const planItem = document.createElement('div');
        planItem.className = `plan-item ${selectedPlanId === plan.id ? 'selected' : ''}`;
        planItem.dataset.planId = plan.id;
        
        planItem.innerHTML = `
            <div class="plan-info">
                <div class="plan-data">${plan.data}</div>
                <div class="plan-duration">${plan.duration}</div>
            </div>
            <div class="plan-right">
                <div class="plan-price">${plan.price}</div>
                <div class="radio-button ${selectedPlanId === plan.id ? 'selected' : ''}">
                    ${selectedPlanId === plan.id ? 
                        '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="5" fill="currentColor"/></svg>' : 
                        ''
                    }
                </div>
            </div>
        `;
        
        planItem.addEventListener('click', () => {
            selectPlan(plan.id);
        });
        
        plansList.appendChild(planItem);
    });
}

// Select plan
function selectPlan(planId) {
    selectedPlanId = planId;
    renderPlans();
    
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
    
    // Очищаем старый список перед добавлением нового
    countriesList.innerHTML = '';
    
    // Render countries list из обновленного массива globalCountries
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
    document.getElementById('nextBtn').addEventListener('click', () => {
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

