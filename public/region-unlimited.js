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

// Function to get flag image URL from local flags folder
function getFlagPath(countryCode) {
    if (!countryCode) {
        return null;
    }
    // Файлы в верхнем регистре: AF.svg, TH.svg и т.д.
    const code = countryCode.toUpperCase();
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
        count: 12,
        countries: [
            'Kazakhstan', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan',
            'Uzbekistan', 'Afghanistan', 'Armenia', 'Azerbaijan',
            'Georgia', 'Mongolia', 'Russia', 'Ukraine'
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

// Get region data from URL
const urlParams = new URLSearchParams(window.location.search);
const regionName = urlParams.get('region') || 'Africa';
const regionInfo = regionData[regionName] || regionData['Africa'];

// Plans data
const unlimitedPlans = [
    { data: '∞ GB', duration: '7 Days', price: '$ 9.99', id: 'unlimited1' },
    { data: '∞ GB', duration: '7 Days', price: '$ 9.99', id: 'unlimited2' },
    { data: '∞ GB', duration: '30 Days', price: '$ 9.99', id: 'unlimited3' },
    { data: '∞ GB', duration: '30 Days', price: '$ 9.99', id: 'unlimited4' }
];

let selectedPlanId = 'unlimited2'; // Default selected

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupRegionInfo();
    setupSegmentedControl();
    renderPlans();
    setupBackButton();
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
        iconElement.innerHTML = `<img src="${iconPath}" alt="${regionName} icon" class="country-flag-img">`;
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

// Setup back button
function setupBackButton() {
    document.getElementById('backBtn').addEventListener('click', () => {
        if (tg) {
            tg.HapticFeedback.impactOccurred('light');
        }
        window.history.back();
    });
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

