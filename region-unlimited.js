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
    // При возврате назад возвращаемся к списку регионов
    if (tg.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            tg.HapticFeedback.impactOccurred('light');
            window.location.href = 'index.html?segment=region';
        });
    }
}

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
        return `/flags/${encodedFileName}`;
    }
    
    return `/flags/${code}.svg`;
}

// Country name to ISO code mapping
const countryNameToCode = {
    'Algeria': 'DZ', 'Angola': 'AO', 'Benin': 'BJ', 'Botswana': 'BW', 'Burkina Faso': 'BF',
    'Burundi': 'BI', 'Cameroon': 'CM', 'Cape Verde': 'CV', 'Chad': 'TD', 'Congo': 'CG',
    'Egypt': 'EG', 'Ethiopia': 'ET', 'Ghana': 'GH', 'Kenya': 'KE', 'Madagascar': 'MG',
    'Malawi': 'MW', 'Mali': 'ML', 'Morocco': 'MA', 'Mozambique': 'MZ', 'Namibia': 'NA',
    'Nigeria': 'NG', 'Senegal': 'SN', 'South Africa': 'ZA', 'Tanzania': 'TZ', 'Tunisia': 'TN',
    'Bangladesh': 'BD', 'Cambodia': 'KH', 'China': 'CN', 'India': 'IN', 'Indonesia': 'ID',
    'Japan': 'JP', 'Kazakhstan': 'KZ', 'Kyrgyzstan': 'KG', 'Laos': 'LA', 'Malaysia': 'MY',
    'Maldives': 'MV', 'Mongolia': 'MN', 'Myanmar': 'MM', 'Nepal': 'NP', 'Pakistan': 'PK',
    'Philippines': 'PH', 'Singapore': 'SG', 'South Korea': 'KR', 'Sri Lanka': 'LK', 'Taiwan': 'TW',
    'Thailand': 'TH', 'Uzbekistan': 'UZ', 'Vietnam': 'VN', 'Afghanistan': 'AF', 'Armenia': 'AM',
    'Azerbaijan': 'AZ', 'Bahrain': 'BH', 'Bhutan': 'BT', 'Brunei': 'BN', 'Georgia': 'GE',
    'Austria': 'AT', 'Belgium': 'BE', 'Bulgaria': 'BG', 'Croatia': 'HR', 'Cyprus': 'CY',
    'Czech Republic': 'CZ', 'Denmark': 'DK', 'Estonia': 'EE', 'Finland': 'FI', 'France': 'FR',
    'Germany': 'DE', 'Greece': 'GR', 'Hungary': 'HU', 'Iceland': 'IS', 'Ireland': 'IE',
    'Italy': 'IT', 'Latvia': 'LV', 'Lithuania': 'LT', 'Luxembourg': 'LU', 'Malta': 'MT',
    'Netherlands': 'NL', 'Norway': 'NO', 'Poland': 'PL', 'Portugal': 'PT', 'Romania': 'RO',
    'Slovakia': 'SK', 'Slovenia': 'SI', 'Spain': 'ES', 'Sweden': 'SE', 'Switzerland': 'CH',
    'China': 'CN', 'Albania': 'AL', 'Belarus': 'BY', 'Bosnia': 'BA', 'Serbia': 'RS',
    'Argentina': 'AR', 'Bolivia': 'BO', 'Brazil': 'BR', 'Chile': 'CL', 'Colombia': 'CO',
    'Costa Rica': 'CR', 'Dominican Republic': 'DO', 'Ecuador': 'EC', 'El Salvador': 'SV', 'Guatemala': 'GT',
    'Honduras': 'HN', 'Mexico': 'MX', 'Nicaragua': 'NI', 'Panama': 'PA', 'Paraguay': 'PY',
    'Peru': 'PE', 'Uruguay': 'UY', 'Venezuela': 'VE', 'Cuba': 'CU', 'Jamaica': 'JM',
    'United States': 'US', 'Canada': 'CA', 'Haiti': 'HT', 'Trinidad and Tobago': 'TT', 'Bahamas': 'BS',
    'Bosnia and Herzegovina': 'BA', 'Montenegro': 'ME', 'North Macedonia': 'MK',
    'Tajikistan': 'TJ', 'Turkmenistan': 'TM', 'Russia': 'RU', 'Ukraine': 'UA',
    'Australia': 'AU', 'New Zealand': 'NZ', 'Fiji': 'FJ', 'Papua New Guinea': 'PG',
    'Samoa': 'WS', 'Tonga': 'TO', 'Vanuatu': 'VU', 'Solomon Islands': 'SB',
    'New Caledonia': 'NC', 'French Polynesia': 'PF'
};

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

// Region country counts and country lists
const regionData = {
    'Africa': {
        count: 12,
        countries: [
            'Egypt', 'Morocco', 'Tanzania', 'Uganda', 'Tunisia',
            'South Africa', 'Zambia', 'Madagascar', 'Nigeria', 'Kenya',
            'Mauritius', 'Réunion'
        ]
    },
    'Asia': {
        count: 12,
        countries: [
            'Hong Kong', 'Indonesia', 'Korea, South', 'Macao', 'Malaysia',
            'Pakistan', 'Singapore', 'Sri Lanka', 'Taiwan', 'Thailand',
            'Uzbekistan', 'Vietnam'
        ]
    },
    'Europe': {
        count: 33,
        countries: [
            'Austria', 'Denmark', 'Ireland', 'Italy', 'Sweden',
            'France', 'Bulgaria', 'Cyprus', 'Estonia', 'Finland',
            'Greece', 'Hungary', 'Latvia', 'Lithuania', 'Netherlands',
            'Norway', 'Poland', 'Romania', 'Slovakia', 'Spain',
            'Germany', 'Malta', 'Switzerland', 'Belgium', 'Croatia',
            'Czech Republic', 'Liechtenstein', 'Luxembourg', 'Portugal', 'Slovenia',
            'Iceland', 'Vatican City', 'Moldova'
        ]
    },
    'Latin America': {
        count: 38,
        countries: [
            'Argentina', 'Brazil', 'Chile', 'Colombia', 'Costa Rica',
            'Ecuador', 'El Salvador', 'Peru', 'Uruguay', 'French Guiana',
            'Mexico', 'Anguilla', 'Antigua and Barbuda', 'Bahamas', 'Barbados',
            'Bermuda', 'Caribbean Netherlands', 'Cayman Islands', 'Curaçao', 'Dominica',
            'Grenada', 'Guyana', 'Haiti', 'Jamaica', 'Martinique',
            'Montserrat', 'Netherlands Antilles', 'Saint Kitts and Nevis', 'Saint Lucia',
            'Saint Vincent and the Grenadines', 'Trinidad and Tobago', 'Turks and Caicos Islands',
            'British Virgin Islands', 'Suriname', 'Guatemala', 'Honduras', 'Nicaragua', 'Panama'
        ]
    },
    'North America': {
        count: 3,
        countries: [
            'Canada', 'Mexico', 'United States'
        ]
    },
    'Balkanas': {
        count: 10,
        countries: [
            'Albania', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia',
            'Greece', 'Montenegro', 'North Macedonia', 'Romania', 'Serbia', 'Slovenia'
        ]
    },
    'Central Eurasia': {
        count: 7,
        countries: [
            'Armenia', 'Kazakhstan', 'Kyrgyzstan', 'Moldova',
            'Russia', 'Ukraine', 'Georgia'
        ]
    },
    'Oceania': {
        count: 2,
        countries: [
            'Australia', 'New Zealand'
        ]
    }
};

// Get region data from URL
const urlParams = new URLSearchParams(window.location.search);
const regionName = urlParams.get('region') || 'Africa';
const regionInfo = regionData[regionName] || regionData['Africa'];

// Plans data - будут загружены из API
let unlimitedPlans = [
    { data: '∞ GB', duration: '7 Days', price: '$ 9.99', id: 'unlimited1' },
    { data: '∞ GB', duration: '7 Days', price: '$ 9.99', id: 'unlimited2' },
    { data: '∞ GB', duration: '30 Days', price: '$ 9.99', id: 'unlimited3' },
    { data: '∞ GB', duration: '30 Days', price: '$ 9.99', id: 'unlimited4' }
];

let selectedPlanId = null; // Будет установлен после загрузки планов

// Если в URL есть параметр plan, используем его как selectedPlanId
const urlPlan = urlParams.get('plan');
if (urlPlan) {
    selectedPlanId = urlPlan;
    console.log('Plan from URL:', urlPlan);
}

// Функция загрузки планов из API
async function loadPlansFromAPI(regionName, useCache = true) {
    console.log('🔵 loadPlansFromAPI (unlimited) called with region:', regionName, 'useCache:', useCache);
    
    // Кэширование включено - сначала проверяем кэш для мгновенной загрузки
    const cacheKey = `region_plans_cache_${regionName}`;
    const cacheTimestampKey = `region_plans_cache_timestamp_${regionName}`;
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа
    
    // Сначала проверяем кэш для мгновенной загрузки
    if (useCache) {
        try {
            const cachedData = localStorage.getItem(cacheKey);
            const cacheTimestamp = localStorage.getItem(cacheTimestampKey);
            
            if (cachedData && cacheTimestamp) {
                const cacheAge = Date.now() - parseInt(cacheTimestamp);
                if (cacheAge < CACHE_TTL) {
                    console.log(`✅ Loading ${regionName} unlimited plans from localStorage cache (instant load)`);
                    const result = JSON.parse(cachedData);
                    
                    if (result.success && result.data) {
                        unlimitedPlans = result.data.unlimited || [];
                        
                        // Добавляем ID для совместимости
                        unlimitedPlans.forEach((plan, index) => {
                            if (!plan.id) {
                                plan.id = plan.bundle_name || `unlimited${index + 1}`;
                            }
                        });
                        
                        if (unlimitedPlans.length > 0 && !selectedPlanId) {
                            selectedPlanId = unlimitedPlans[0].id;
                        }
                        
                        // Обновляем UI с кэшированными данными
                        renderPlans();
                        
                        // Обновляем из API в фоне
                        setTimeout(() => {
                            loadPlansFromAPI(regionName, false).then((success) => {
                                if (success) {
                                    renderPlans();
                                }
                            });
                        }, 100);
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
    }
    
    try {
        const params = new URLSearchParams();
        if (regionName) {
            params.append('region', regionName);
        }
        
        const apiUrl = `/api/esimgo/region-plans?${params.toString()}`;
        console.log('🔵 Fetching region unlimited plans from API:', apiUrl);
        
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
            console.log(`✅ ${regionName} unlimited plans saved to localStorage cache`);
        } catch (cacheError) {
            console.warn('⚠️ Error saving to cache:', cacheError);
        }
        
        if (result.success && result.data) {
            unlimitedPlans = result.data.unlimited || [];
            
            // Добавляем ID для совместимости - используем bundle_name как основной ID
            unlimitedPlans.forEach((plan, index) => {
                if (!plan.id) {
                    // Приоритет: bundle_name > сгенерированный ID
                    plan.id = plan.bundle_name || `unlimited${index + 1}`;
                }
                // Убеждаемся, что bundle_name сохранен для использования в checkout
                if (plan.bundle_name && plan.id !== plan.bundle_name) {
                    // Если ID отличается от bundle_name, сохраняем bundle_name отдельно
                    plan.originalBundleName = plan.bundle_name;
                }
            });
            
            // Устанавливаем план из URL, если он есть и найден в загруженных планах
            const urlPlan = urlParams.get('plan');
            if (urlPlan) {
                const foundPlan = unlimitedPlans.find(p => 
                    p.id === urlPlan || 
                    p.bundle_name === urlPlan ||
                    p.originalBundleName === urlPlan
                );
                if (foundPlan) {
                    // Используем ID плана (который может быть bundle_name)
                    selectedPlanId = foundPlan.id;
                    console.log('✅ Plan from URL found and selected:', selectedPlanId, 'bundle_name:', foundPlan.bundle_name);
                } else {
                    console.warn('⚠️ Plan from URL not found in loaded plans:', urlPlan);
                    console.warn('⚠️ Available plan IDs:', unlimitedPlans.map(p => ({ id: p.id, bundle_name: p.bundle_name })));
                    // Если план не найден, используем первый доступный
                    if (unlimitedPlans.length > 0) {
                        selectedPlanId = unlimitedPlans[0].id;
                        console.log('⚠️ Using first available plan instead:', selectedPlanId);
                    }
                }
            } else if (unlimitedPlans.length > 0 && !selectedPlanId) {
                selectedPlanId = unlimitedPlans[0].id;
                console.log('✅ No plan in URL, using first plan:', selectedPlanId);
            }
            
            console.log(`✅ Loaded ${unlimitedPlans.length} unlimited plans from API`);
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
        unlimitedPlans = [
            { data: '∞ GB', duration: '7 Days', price: '$ 9.99', id: 'unlimited1' },
            { data: '∞ GB', duration: '7 Days', price: '$ 9.99', id: 'unlimited2' },
            { data: '∞ GB', duration: '30 Days', price: '$ 9.99', id: 'unlimited3' },
            { data: '∞ GB', duration: '30 Days', price: '$ 9.99', id: 'unlimited4' }
        ];
        if (!selectedPlanId) {
            selectedPlanId = 'unlimited2';
        }
        console.warn('⚠️ Using fallback plans (hardcoded)');
        return false;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('region-unlimited.js: DOMContentLoaded');
    console.log('Region name:', regionName);
    
    setupRegionInfo();
    setupSegmentedControl();
    
    // Загружаем безлимитные тарифы из API
    console.log('🔵 Loading unlimited plans from API');
    await loadPlansFromAPI(regionName);
    
    renderPlans();
    setupNextButton();
    setupCountriesList();
    setupNavigation();
    
    // Убеждаемся, что нижнее меню всегда видно
    ensureBottomNavVisible();
    setTimeout(ensureBottomNavVisible, 100);
    setTimeout(ensureBottomNavVisible, 300);
    
    console.log('region-unlimited.js: Initialization complete');
    console.log('Selected plan ID:', selectedPlanId);
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
        bottomNav.style.zIndex = '1002';
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

// Setup region info
function setupRegionInfo() {
    const iconElement = document.getElementById('regionIcon');
    const nameElement = document.getElementById('regionName');
    const infoTextElement = document.getElementById('regionInfoText');
    
    const iconFileName = regionIconMap[regionName] || 'Afrrica.png';
    const iconPath = `Region/${iconFileName}`;
    
    if (iconElement) {
        // Для иконки Африки добавляем специальный класс для уменьшения размера
        const isAfrica = regionName === 'Africa';
        const imgClass = isAfrica ? 'region-icon-africa' : '';
        iconElement.innerHTML = `<img src="${iconPath}" alt="${regionName} icon"${imgClass ? ` class="${imgClass}"` : ''}>`;
    }
    
    if (nameElement) {
        nameElement.textContent = regionName;
    }
    
    if (infoTextElement) {
        infoTextElement.textContent = `Supported in countries: ${regionInfo.count}`;
    }
}

// Setup segmented control
function setupSegmentedControl() {
    const segmentButtons = document.querySelectorAll('.plans-segmented .segment-btn');
    
    segmentButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            segmentButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            
            const planType = btn.dataset.planType;
            if (planType === 'standard') {
                // Navigate to standard plans page
                const params = new URLSearchParams({
                    region: regionName
                });
                window.location.href = `region-plans.html?${params.toString()}`;
            }
        });
    });
}

// Render plans list
function renderPlans() {
    const plansList = document.getElementById('plansList');
    if (!plansList) {
        console.error('plansList element not found');
        return;
    }
    plansList.innerHTML = '';
    
    console.log('🔵 Rendering plans:', unlimitedPlans.length, 'selectedPlanId:', selectedPlanId);
    
    unlimitedPlans.forEach(plan => {
        // Проверяем, выбран ли этот план (сравниваем по ID или bundle_name)
        const isSelected = selectedPlanId === plan.id || 
                          selectedPlanId === plan.bundle_name ||
                          (plan.bundle_name && selectedPlanId === plan.bundle_name);
        
        const planItem = document.createElement('div');
        planItem.className = `plan-item ${isSelected ? 'selected' : ''}`;
        planItem.dataset.planId = plan.id;
        
        planItem.innerHTML = `
            <div class="plan-info">
                <div class="plan-data">${plan.data}</div>
                <div class="plan-duration">${plan.duration}</div>
            </div>
            <div class="plan-right">
                <div class="plan-price">${plan.price}</div>
                <div class="radio-button ${isSelected ? 'selected' : ''}">
                    ${isSelected ? 
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
    // Находим план по ID, чтобы убедиться, что используем правильный ID
    const plan = unlimitedPlans.find(p => p.id === planId || p.bundle_name === planId);
    if (plan) {
        selectedPlanId = plan.id; // Используем ID из загруженного плана
        console.log('✅ Plan selected:', selectedPlanId, 'bundle_name:', plan.bundle_name);
    } else {
        selectedPlanId = planId; // Fallback на переданный ID
        console.warn('⚠️ Plan not found in loaded plans, using provided ID:', planId);
    }
    renderPlans();
    
    if (tg) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// Setup countries list toggle
function setupCountriesList() {
    const banner = document.getElementById('regionInfoBanner');
    const chevron = document.getElementById('regionInfoChevron');
    const container = document.getElementById('countriesListContainer');
    const countriesList = document.getElementById('countriesList');
    let isExpanded = false;
    
    // Render countries list
    if (countriesList && regionInfo.countries) {
        regionInfo.countries.forEach(countryName => {
            const countryItem = document.createElement('div');
            countryItem.className = 'country-item-small';
            countryItem.textContent = countryName;
            countriesList.appendChild(countryItem);
        });
    }
    
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
        console.error('nextBtn element not found');
        return;
    }
    
    nextBtn.addEventListener('click', () => {
        console.log('🔵 Next button clicked');
        console.log('🔵 selectedPlanId:', selectedPlanId);
        console.log('🔵 regionName:', regionName);
        console.log('🔵 unlimitedPlans:', unlimitedPlans);
        
        if (!selectedPlanId) {
            console.warn('❌ No plan selected');
            if (tg) {
                tg.showAlert('Please select a plan');
            } else {
                alert('Please select a plan');
            }
            return false;
        }
        
        if (tg) {
            try {
                tg.HapticFeedback.impactOccurred('medium');
            } catch (e) {
                console.warn('HapticFeedback error:', e);
            }
        }
        
        // Находим выбранный план, чтобы убедиться, что используем правильный ID
        const selectedPlan = unlimitedPlans.find(p => 
            p.id === selectedPlanId || 
            p.bundle_name === selectedPlanId
        );
        
        // Используем ID плана (который может быть bundle_name)
        const planIdForCheckout = selectedPlan ? selectedPlan.id : selectedPlanId;
        
        console.log('🔵 Selected plan for checkout:', {
            selectedPlanId: selectedPlanId,
            planIdForCheckout: planIdForCheckout,
            bundle_name: selectedPlan?.bundle_name,
            plan: selectedPlan
        });
        
        // Navigate to checkout screen
        const params = new URLSearchParams({
            type: 'region',
            name: regionName,
            plan: planIdForCheckout,
            planType: 'unlimited'
        });
        
        const checkoutUrl = `checkout.html?${params.toString()}`;
        console.log('🔵 Navigating to checkout:', checkoutUrl);
        
        // Используем window.location.assign для более надежного перехода
        window.location.assign(checkoutUrl);
        
        return false; // Предотвращаем стандартное поведение кнопки
    });
}

