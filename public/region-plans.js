// Telegram Web App initialization
let tg = window.Telegram.WebApp;

// Initialize Telegram Web App
if (tg) {
    tg.ready();
    tg.expand();
    
    // Set theme colors
    tg.setHeaderColor('#FFFFFF');
    tg.setBackgroundColor('#F2F2F7');
}

// Функция для настройки BackButton
function setupBackButton() {
    // Обновляем ссылку на tg, так как она может измениться
    tg = window.Telegram?.WebApp;
    
    if (tg && tg.BackButton) {
        console.log('🔙 Region: Настраиваем BackButton', { tg: !!tg, BackButton: !!tg.BackButton });
        
        // Показываем кнопку
        tg.BackButton.show();
        
        // Устанавливаем обработчик с задержкой, чтобы убедиться, что он не переопределяется
        setTimeout(() => {
            if (tg && tg.BackButton) {
                console.log('🔙 Region: Устанавливаем обработчик onClick');
                tg.BackButton.onClick(() => {
                    console.log('🔙 Region: BackButton нажата, переходим на Local');
                    
                    if (tg && tg.HapticFeedback) {
                        try {
                            tg.HapticFeedback.impactOccurred('light');
                        } catch (e) {
                            console.warn('⚠️ Region: Ошибка при вызове HapticFeedback', e);
                        }
                    }
                    
                    // Переходим обратно на список регионов
                    try {
                        window.location.href = 'index.html?segment=region';
                    } catch (e) {
                        console.error('❌ Region: Ошибка при переходе на список регионов', e);
                        // Fallback на window.location
                        window.location = 'index.html?segment=region';
                    }
                });
                console.log('🔙 Region: BackButton настроена успешно');
            } else {
                console.warn('⚠️ Region: tg или BackButton недоступны при установке обработчика');
            }
        }, 100);
    } else {
        console.warn('⚠️ Region: Telegram WebApp или BackButton недоступны', { tg: !!tg, BackButton: tg && !!tg.BackButton });
    }
}

// Настраиваем BackButton после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🔙 Region: DOM загружен, настраиваем BackButton');
        setupBackButton();
    });
} else {
    console.log('🔙 Region: DOM уже загружен, настраиваем BackButton сразу');
    setupBackButton();
}

// Также настраиваем BackButton при полной загрузке страницы (на случай, если что-то переопределило)
window.addEventListener('load', () => {
    console.log('🔙 Region: Страница полностью загружена, проверяем BackButton');
    setupBackButton();
});

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
const regionDataFull = {
    'Africa': {
        count: 25,
        countries: [
            'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso',
            'Burundi', 'Cameroon', 'Cape Verde', 'Chad', 'Congo',
            'Egypt', 'Ethiopia', 'Ghana', 'Kenya', 'Madagascar',
            'Malawi', 'Mali', 'Morocco', 'Mozambique', 'Namibia',
            'Nigeria', 'Senegal', 'South Africa', 'Tanzania', 'Tunisia'
        ]
    },
    'Asia': {
        count: 30,
        countries: [
            'Bangladesh', 'Cambodia', 'China', 'India', 'Indonesia',
            'Japan', 'Kazakhstan', 'Kyrgyzstan', 'Laos', 'Malaysia',
            'Maldives', 'Mongolia', 'Myanmar', 'Nepal', 'Pakistan',
            'Philippines', 'Singapore', 'South Korea', 'Sri Lanka', 'Taiwan',
            'Thailand', 'Uzbekistan', 'Vietnam', 'Afghanistan', 'Armenia',
            'Azerbaijan', 'Bahrain', 'Bhutan', 'Brunei', 'Georgia'
        ]
    },
    'Europe': {
        count: 35,
        countries: [
            'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus',
            'Czech Republic', 'Denmark', 'Estonia', 'Finland', 'France',
            'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland',
            'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta',
            'Netherlands', 'Norway', 'Poland', 'Portugal', 'Romania',
            'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland',
            'China', 'Albania', 'Belarus', 'Bosnia', 'Serbia'
        ]
    },
    'Latin America': {
        count: 20,
        countries: [
            'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia',
            'Costa Rica', 'Dominican Republic', 'Ecuador', 'El Salvador', 'Guatemala',
            'Honduras', 'Mexico', 'Nicaragua', 'Panama', 'Paraguay',
            'Peru', 'Uruguay', 'Venezuela', 'Cuba', 'Jamaica'
        ]
    },
    'North America': {
        count: 15,
        countries: [
            'United States', 'Canada', 'Mexico', 'Guatemala', 'Honduras',
            'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama', 'Cuba',
            'Jamaica', 'Haiti', 'Dominican Republic', 'Trinidad and Tobago', 'Bahamas'
        ]
    },
    'Balkanas': {
        count: 8,
        countries: [
            'Albania', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia',
            'Greece', 'Montenegro', 'North Macedonia', 'Serbia'
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
        count: 10,
        countries: [
            'Australia', 'New Zealand', 'Fiji', 'Papua New Guinea',
            'Samoa', 'Tonga', 'Vanuatu', 'Solomon Islands',
            'New Caledonia', 'French Polynesia'
        ]
    }
};

// Region country counts (for backward compatibility)
const regionCountryCounts = {
    'Africa': 25,
    'Asia': 30,
    'Europe': 35,
    'Latin America': 20,
    'North America': 15,
    'Balkanas': 8,
    'Central Eurasia': 7,
    'Oceania': 10
};

// Get region data from URL
const urlParams = new URLSearchParams(window.location.search);
const regionData = {
    name: urlParams.get('region') || 'Africa'
};

// Plans data - загружаются динамически из API
let standardPlans = [];
let unlimitedPlans = [];

// Функция загрузки планов из API
async function loadPlansFromAPI(regionName) {
    console.log('🔵 loadPlansFromAPI called with region:', regionName);
    
    try {
        const params = new URLSearchParams();
        if (regionName) {
            params.append('region', regionName);
        }
        
        // Используем новый endpoint для региональных тарифов
        // Он возвращает только fixed тарифы (без unlimited) для регионов
        const apiUrl = `/api/esimgo/region-plans?${params.toString()}`;
        console.log('🔵 Fetching region plans from:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('🔵 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error Response:', errorText);
            throw new Error(`API returned ${response.status}: ${errorText.substring(0, 100)}`);
        }
        
        const result = await response.json();
        console.log('🔵 API response:', result);
        
        if (result.success && result.data) {
            standardPlans = result.data.standard || [];
            unlimitedPlans = []; // Для регионов всегда пустой массив (только fixed тарифы)
            
            // Обновляем список стран из API ответа
            if (result.data.countries && Array.isArray(result.data.countries)) {
                const apiCountries = result.data.countries.map(c => c.name || c.code);
                if (apiCountries.length > 0) {
                    // Обновляем regionDataFull с данными из API
                    if (!regionDataFull[regionName]) {
                        regionDataFull[regionName] = {
                            count: apiCountries.length,
                            countries: apiCountries
                        };
                    } else {
                        regionDataFull[regionName].count = apiCountries.length;
                        regionDataFull[regionName].countries = apiCountries;
                    }
                    // Обновляем счетчик для обратной совместимости
                    regionCountryCounts[regionName] = apiCountries.length;
                    console.log(`✅ Updated countries list for ${regionName} from API:`, apiCountries.length, 'countries');
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
            
            console.log('Plans loaded from API:', {
                standard: standardPlans.length,
                unlimited: unlimitedPlans.length,
                region: regionName,
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
    setupRegionInfo();
    setupSegmentedControl();
    
    // Получаем название региона из URL
    const urlParams = new URLSearchParams(window.location.search);
    const regionName = urlParams.get('region') || 'Africa';
    
    // Загружаем реальные планы из API для региона
    console.log('🔵 Loading plans for region:', regionName);
    await loadPlansFromAPI(regionName);
    
    // Рендерим планы после загрузки
    renderPlans();
    updateInfoBox();
    setupNextButton();
    setupCountriesList();
});

// Setup region info
function setupRegionInfo() {
    const iconElement = document.getElementById('regionIcon');
    const nameElement = document.getElementById('regionName');
    const infoTextElement = document.getElementById('regionInfoText');
    
    const iconFileName = regionIconMap[regionData.name] || 'Afrrica.png';
    const iconPath = `Region/${iconFileName}`;
    
    if (iconElement) {
        iconElement.innerHTML = `<img src="${iconPath}" alt="${regionData.name} icon" class="country-flag-img">`;
    }
    
    if (nameElement) {
        nameElement.textContent = regionData.name;
    }
    
    // Обновляем счетчик стран после загрузки данных из API
    const regionInfo = regionDataFull[regionData.name] || regionDataFull['Africa'];
    const countryCount = regionInfo ? regionInfo.count : (regionCountryCounts[regionData.name] || 25);
    if (infoTextElement) {
        infoTextElement.textContent = `Supported in countries: ${countryCount}`;
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
    if (!plansList) {
        console.error('plansList element not found');
        return;
    }
    
    plansList.innerHTML = '';
    
    const plans = currentPlanType === 'standard' ? standardPlans : unlimitedPlans;
    
    console.log('Rendering plans:', {
        type: currentPlanType,
        count: plans.length,
        plans: plans
    });
    
    if (plans.length === 0) {
        plansList.innerHTML = '<div class="no-plans">No plans available</div>';
        return;
    }
    
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
    const banner = document.getElementById('regionInfoBanner');
    const chevron = document.getElementById('regionInfoChevron');
    const container = document.getElementById('countriesListContainer');
    const countriesList = document.getElementById('countriesList');
    
    if (!banner || !chevron || !container || !countriesList) return;
    
    const regionInfo = regionDataFull[regionData.name] || regionDataFull['Africa'];
    let isExpanded = false;
    
    // Render countries list
    regionInfo.countries.forEach(countryName => {
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
        
        // Navigate based on plan type
        const params = new URLSearchParams({
            region: regionData.name,
            plan: selectedPlanId
        });
        
        if (currentPlanType === 'unlimited') {
            window.location.href = `region-unlimited.html?${params.toString()}`;
        } else {
            // Navigate to checkout screen
            const checkoutParams = new URLSearchParams({
                type: 'region',
                name: regionData.name,
                plan: selectedPlanId,
                planType: currentPlanType
            });
            window.location.href = `checkout.html?${checkoutParams.toString()}`;
        }
    });
}

