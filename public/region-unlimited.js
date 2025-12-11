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
    if (tg && tg.BackButton) {
        console.log('🔙 Region Unlimited: Показываем BackButton');
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            console.log('🔙 Region Unlimited: BackButton нажата, переходим на Local');
            if (tg && tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
            }
            // Переходим обратно на Local страницу (главная)
            window.location.href = 'local-countries.html';
        });
    } else {
        console.warn('⚠️ Region Unlimited: Telegram WebApp или BackButton недоступны', { tg: !!tg, BackButton: tg && !!tg.BackButton });
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

// Plans data - загружаются динамически из API
let unlimitedPlans = [];
let selectedPlanId = null; // Default selected

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
                    
                    // Используем данные из кэша для мгновенной загрузки
                    if (result.success && result.data) {
                        unlimitedPlans = result.data.unlimited || [];
                        
                        // НЕ перезаписываем regionData данными из API
                        // Используем только предопределенные данные из regionData
                        
                        // Добавляем ID для совместимости
                        unlimitedPlans.forEach((plan, index) => {
                            if (!plan.id) {
                                plan.id = plan.bundle_name || `unlimited${index + 1}`;
                            }
                        });
                        
                        if (unlimitedPlans.length > 0 && !selectedPlanId) {
                            selectedPlanId = unlimitedPlans[0].id;
                        }
                        
                        // Обновляем счетчик стран из предопределенных данных
                        const regionInfo = regionData[regionName] || regionData['Africa'];
                        if (regionInfo) {
                            const infoTextElement = document.getElementById('regionInfoText');
                            if (infoTextElement) {
                                infoTextElement.textContent = `Supported in countries: ${regionInfo.count}`;
                            }
                        }
                        
                        console.log(`✅ ${regionName} unlimited plans loaded from cache:`, unlimitedPlans.length);
                        
                        // Обновляем UI с кэшированными данными
                        renderPlans();
                        updateInfoBox();
                        
                        // Возвращаем true, но продолжаем обновление из API в фоне
                        // Это позволяет показать кэшированные данные сразу
                        setTimeout(() => {
                            loadPlansFromAPI(regionName, false).then((success) => {
                                if (success) {
                                    // Обновляем UI с актуальными данными из API
                                    renderPlans();
                                    updateInfoBox();
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
        
        // Используем endpoint для региональных тарифов
        // Он возвращает как standard, так и unlimited тарифы для регионов
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
        
        // Сохраняем в кэш для следующего запуска
        try {
            localStorage.setItem(cacheKey, JSON.stringify(result));
            localStorage.setItem(cacheTimestampKey, Date.now().toString());
            console.log(`✅ ${regionName} unlimited plans saved to localStorage cache`);
        } catch (cacheError) {
            console.warn('⚠️ Error saving to cache:', cacheError);
        }
        
        if (result.success && result.data) {
            unlimitedPlans = result.data.unlimited || [];
            
            // НЕ перезаписываем regionData данными из API
            // Используем только предопределенные данные из regionData
            
            // Добавляем ID для совместимости
            unlimitedPlans.forEach((plan, index) => {
                if (!plan.id) {
                    plan.id = plan.bundle_name || `unlimited${index + 1}`;
                }
            });
            
            // Устанавливаем первый план как выбранный по умолчанию
            if (unlimitedPlans.length > 0 && !selectedPlanId) {
                selectedPlanId = unlimitedPlans[0].id;
            }
            
            // Обновляем счетчик стран из предопределенных данных
            const regionInfo = regionData[regionName] || regionData['Africa'];
            if (regionInfo) {
                const infoTextElement = document.getElementById('regionInfoText');
                if (infoTextElement) {
                    infoTextElement.textContent = `Supported in countries: ${regionInfo.count}`;
                }
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
    setupRegionInfo();
    setupSegmentedControl();
    
    // Загружаем безлимитные тарифы из API
    console.log('🔵 Loading unlimited plans from API');
    await loadPlansFromAPI(regionName);
    
    renderPlans();
    setupNextButton();
    setupCountriesList();
});

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
        if (isAfrica) {
            // Добавляем класс к контейнеру для специальной обработки
            iconElement.classList.add('africa-icon-container');
        } else {
            iconElement.classList.remove('africa-icon-container');
        }
        const imgClass = isAfrica ? 'region-icon-africa' : '';
        iconElement.innerHTML = `<img src="${iconPath}" alt="${regionName} icon"${imgClass ? ` class="${imgClass}"` : ''}>`;
    }
    
    if (nameElement) {
        nameElement.textContent = regionName;
    }
    
    if (infoTextElement) {
        // Используем предопределенное значение count из regionData
        const actualCount = regionInfo.count || 0;
        infoTextElement.textContent = `Supported in countries: ${actualCount}`;
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
    plansList.innerHTML = '';
    
    unlimitedPlans.forEach(plan => {
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
            type: 'region',
            name: regionName,
            plan: selectedPlanId,
            planType: 'unlimited'
        });
        window.location.href = `checkout.html?${params.toString()}`;
    });
}

