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
    // При возврате назад переходим на главную вкладку Region (там BackButton будет работать → Local)
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
const regionDataFull = {
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

// Region country counts (for backward compatibility)
const regionCountryCounts = {
    'Africa': 12,
    'Asia': 12,
    'Europe': 33,
    'Latin America': 38,
    'North America': 3,
    'Balkanas': 10,
    'Central Eurasia': 7,
    'Oceania': 2
};

// Get region data from URL
const urlParams = new URLSearchParams(window.location.search);
const regionData = {
    name: urlParams.get('region') || 'Africa'
};

// Plans data (загружаются из статических файлов через DataLoader)
let standardPlans = [];
let unlimitedPlans = [];

let currentPlanType = 'standard';
let selectedPlanId = null; // Будет установлен после загрузки планов

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    setupRegionInfo();
    setupSegmentedControl();
    await loadRegionPlans(regionData.name);
    renderPlans();
    updateInfoBox();
    setupNextButton();
    setupCountriesList();
    setupNavigation();
    
    // Убеждаемся, что нижнее меню всегда видно
    ensureBottomNavVisible();
    setTimeout(ensureBottomNavVisible, 100);
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
        bottomNav.style.zIndex = '1000';
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

// Load region plans using DataLoader (static JSON -> API)
async function loadRegionPlans(regionName) {
    console.log('🔵 Loading region plans for:', regionName);
    
    try {
        let data = null;
        if (window.DataLoader && typeof window.DataLoader.loadRegionPlans === 'function') {
            console.log('⚡ Using DataLoader.loadRegionPlans');
            data = await window.DataLoader.loadRegionPlans(regionName);
            if (data) {
                console.log('✅ Plans loaded via DataLoader:', {
                    standard: data.standard?.length || 0,
                    unlimited: data.unlimited?.length || 0
                });
            }
        } else {
            console.log('📁 DataLoader not available, trying static file');
            // Fallback: direct static file (slug like europe, latin-america)
            const slug = String(regionName || '').toLowerCase().replace(/\s+/g, '-');
            const staticPath = `/data/plans-region-${slug}.json`;
            console.log('📁 Trying static file:', staticPath);
            const resp = await fetch(staticPath);
            if (resp.ok) {
                const json = await resp.json();
                if (json && json.success && json.data) {
                    data = json.data;
                    console.log('✅ Plans loaded from static file');
                }
            } else {
                console.warn('⚠️ Static file not found:', staticPath);
            }
        }

        if (data) {
            standardPlans = data.standard || [];
            unlimitedPlans = data.unlimited || [];

            console.log('📊 Plans parsed:', {
                standard: standardPlans.length,
                unlimited: unlimitedPlans.length
            });

            // Ensure ids for selection compatibility
            standardPlans.forEach((p, idx) => { 
                if (!p.id) {
                    // Используем bundle_name как приоритетный ID
                    p.id = p.bundle_name || `plan${idx + 1}`;
                }
                // Убеждаемся, что bundle_name сохранен
                if (!p.bundle_name && p.id) {
                    p.bundle_name = p.id;
                }
            });
            // Для unlimited планов используем bundle_name как ID, если он есть
            unlimitedPlans.forEach((p, idx) => { 
                if (!p.id) {
                    // Используем bundle_name как приоритетный ID
                    p.id = p.bundle_name || `unlimited${idx + 1}`;
                }
                // Убеждаемся, что bundle_name сохранен
                if (!p.bundle_name && p.id) {
                    p.bundle_name = p.id;
                }
            });
            
            console.log('📋 Plans IDs set:', {
                standard: standardPlans.map(p => ({ id: p.id, bundle_name: p.bundle_name })).slice(0, 3),
                unlimited: unlimitedPlans.map(p => ({ id: p.id, bundle_name: p.bundle_name })).slice(0, 3)
            });
            
            // Устанавливаем выбранный план по умолчанию после загрузки
            if (!selectedPlanId && standardPlans.length > 0) {
                selectedPlanId = standardPlans[0].id || standardPlans[0].bundle_name;
                console.log('✅ Default plan selected:', selectedPlanId);
            }
            
            return true;
        } else {
            console.warn('⚠️ No plans data received');
        }
    } catch (e) {
        console.error('❌ Failed to load region plans:', e);
    }

    console.warn('⚠️ No plans available, showing empty list');
    standardPlans = [];
    unlimitedPlans = [];
    return false;
}

// Setup region info
function setupRegionInfo() {
    console.log('🔵 Setting up region info for:', regionData.name);
    
    const iconElement = document.getElementById('regionIcon');
    const nameElement = document.getElementById('regionName');
    const infoTextElement = document.getElementById('regionInfoText');
    
    if (!iconElement) {
        console.error('❌ regionIcon element not found');
    }
    if (!nameElement) {
        console.error('❌ regionName element not found');
    }
    
    const iconFileName = regionIconMap[regionData.name] || 'Afrrica.png';
    const iconPath = `Region/${iconFileName}`;
    console.log('📍 Icon path:', iconPath);
    
    if (iconElement) {
        // Для иконки Африки добавляем специальный класс для уменьшения размера
        const isAfrica = regionData.name === 'Africa';
        const imgClass = isAfrica ? 'region-icon-africa' : '';
        iconElement.innerHTML = `<img src="${iconPath}" alt="${regionData.name} icon"${imgClass ? ` class="${imgClass}"` : ''} onerror="console.error('Failed to load icon:', this.src); this.style.display='none';">`;
        console.log('✅ Icon set');
    }
    
    if (nameElement) {
        nameElement.textContent = regionData.name;
        console.log('✅ Region name set:', regionData.name);
    }
    
    const countryCount = regionCountryCounts[regionData.name] || 25;
    if (infoTextElement) {
        infoTextElement.textContent = `Supported in countries: ${countryCount}`;
        console.log('✅ Info text set');
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
            
            // Устанавливаем выбранный план по умолчанию из реальных загруженных планов
            if (currentPlanType === 'unlimited') {
                // Используем первый план из unlimitedPlans, если он есть
                selectedPlanId = unlimitedPlans.length > 0 ? unlimitedPlans[0].id : null;
            } else {
                // Для standard используем первый план из standardPlans
                selectedPlanId = standardPlans.length > 0 ? standardPlans[0].id : null;
            }
            
            console.log('🔄 Plan type changed to:', currentPlanType, 'selectedPlanId:', selectedPlanId);
            
            renderPlans();
            updateInfoBox();
        });
    });
}

// Render plans list
function renderPlans() {
    const plansList = document.getElementById('plansList');
    if (!plansList) {
        console.error('❌ plansList element not found');
        return;
    }
    
    plansList.innerHTML = '';
    
    const plans = currentPlanType === 'standard' ? standardPlans : unlimitedPlans;
    
    console.log('🔵 Rendering plans:', {
        type: currentPlanType,
        count: plans.length,
        selectedPlanId
    });
    
    if (plans.length === 0) {
        plansList.innerHTML = '<div class="no-plans">No plans available</div>';
        console.warn('⚠️ No plans to render');
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
                <div class="plan-price">${formatPrice(plan.priceValue || plan.price || '9.99')}</div>
                <div class="radio-button ${selectedPlanId === plan.id ? 'selected' : ''}">
                    ${selectedPlanId === plan.id ? 
                        '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="5" fill="currentColor"/></svg>' : 
                        ''
                    }
                </div>
            </div>
        `;
        
        planItem.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔵 Plan item clicked:', {
                planId: plan.id,
                bundle_name: plan.bundle_name,
                currentPlanType: currentPlanType,
                region: regionData.name
            });
            selectPlan(plan.id || plan.bundle_name);
            // НЕ перенаправляем на region-unlimited.html - остаемся на той же странице
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
    console.log('🔵 Plan selected:', planId);
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
    const nextBtn = document.getElementById('nextBtn');
    if (!nextBtn) {
        console.error('❌ Next button not found');
        return;
    }
    
    // Удаляем старые обработчики, если они есть
    const newNextBtn = nextBtn.cloneNode(true);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    
    newNextBtn.addEventListener('click', () => {
        console.log('🔵 Next button clicked:', {
            selectedPlanId,
            currentPlanType,
            region: regionData.name
        });
        
        if (!selectedPlanId) {
            console.warn('⚠️ No plan selected');
            if (tg) {
                tg.showAlert('Please select a plan');
            } else {
                alert('Please select a plan');
            }
            return;
        }
        
        // Проверяем, что выбранный план существует в загруженных планах
        const plans = currentPlanType === 'standard' ? standardPlans : unlimitedPlans;
        const selectedPlan = plans.find(p => p.id === selectedPlanId || p.bundle_name === selectedPlanId);
        
        if (!selectedPlan) {
            console.error('❌ Selected plan not found in loaded plans:', {
                selectedPlanId,
                currentPlanType,
                availablePlans: plans.map(p => ({ id: p.id, bundle_name: p.bundle_name })).slice(0, 5)
            });
            if (tg) {
                tg.showAlert('Selected plan not found. Please select again.');
            } else {
                alert('Selected plan not found. Please select again.');
            }
            return;
        }
        
        console.log('✅ Selected plan found:', {
            id: selectedPlan.id,
            bundle_name: selectedPlan.bundle_name,
            price: selectedPlan.price || selectedPlan.priceValue
        });
        
        if (tg) {
            tg.HapticFeedback.impactOccurred('medium');
        }
        
        // Navigate to checkout screen for both standard and unlimited plans
        // Используем bundle_name если есть, иначе id
        const planIdForCheckout = selectedPlan.bundle_name || selectedPlan.id || selectedPlanId;
        
        const checkoutParams = new URLSearchParams({
            type: 'region',
            name: regionData.name,
            plan: planIdForCheckout,
            planType: currentPlanType
        });
        
        const checkoutUrl = `checkout.html?${checkoutParams.toString()}`;
        console.log('📍 Navigating to checkout:', checkoutUrl);
        window.location.href = checkoutUrl;
    });
}

