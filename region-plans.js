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
            // Переходим на Local страницу (главная)
            window.location.href = 'local-countries.html';
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

// Plans data
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

let currentPlanType = 'standard';
let selectedPlanId = 'plan2'; // Default selected for standard

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupRegionInfo();
    setupSegmentedControl();
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
        // Для иконки Африки добавляем специальный класс для уменьшения размера
        const isAfrica = regionData.name === 'Africa';
        const imgClass = isAfrica ? 'region-icon-africa' : '';
        iconElement.innerHTML = `<img src="${iconPath}" alt="${regionData.name} icon"${imgClass ? ` class="${imgClass}"` : ''}>`;
    }
    
    if (nameElement) {
        nameElement.textContent = regionData.name;
    }
    
    const countryCount = regionCountryCounts[regionData.name] || 25;
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

