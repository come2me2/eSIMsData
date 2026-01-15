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

// ISO to country name mapping (for converting country codes to full names)
const isoToCountryName = {
    'AD': 'Andorra', 'AE': 'United Arab Emirates', 'AF': 'Afghanistan', 'AG': 'Antigua and Barbuda',
    'AI': 'Anguilla', 'AL': 'Albania', 'AM': 'Armenia', 'AO': 'Angola', 'AQ': 'Antarctica',
    'AR': 'Argentina', 'AS': 'American Samoa', 'AT': 'Austria', 'AU': 'Australia', 'AW': 'Aruba',
    'AX': 'Åland Islands', 'AZ': 'Azerbaijan', 'BA': 'Bosnia and Herzegovina', 'BB': 'Barbados',
    'BD': 'Bangladesh', 'BE': 'Belgium', 'BF': 'Burkina Faso', 'BG': 'Bulgaria', 'BH': 'Bahrain',
    'BI': 'Burundi', 'BJ': 'Benin', 'BL': 'Saint Barthélemy', 'BM': 'Bermuda', 'BN': 'Brunei',
    'BO': 'Bolivia', 'BQ': 'Caribbean Netherlands', 'BR': 'Brazil', 'BS': 'Bahamas', 'BT': 'Bhutan',
    'BV': 'Bouvet Island', 'BW': 'Botswana', 'BY': 'Belarus', 'BZ': 'Belize', 'CA': 'Canada',
    'CC': 'Cocos Islands', 'CD': 'Congo, Democratic Republic', 'CF': 'Central African Republic',
    'CG': 'Congo', 'CH': 'Switzerland', 'CI': 'Côte d\'Ivoire', 'CK': 'Cook Islands', 'CL': 'Chile',
    'CM': 'Cameroon', 'CN': 'China', 'CO': 'Colombia', 'CR': 'Costa Rica', 'CU': 'Cuba',
    'CV': 'Cabo Verde', 'CW': 'Curaçao', 'CX': 'Christmas Island', 'CY': 'Cyprus',
    'CZ': 'Czech Republic', 'DE': 'Germany', 'DJ': 'Djibouti', 'DK': 'Denmark', 'DM': 'Dominica',
    'DO': 'Dominican Republic', 'DZ': 'Algeria', 'EC': 'Ecuador', 'EE': 'Estonia', 'EG': 'Egypt',
    'EH': 'Western Sahara', 'ER': 'Eritrea', 'ES': 'Spain', 'ET': 'Ethiopia', 'FI': 'Finland',
    'FJ': 'Fiji', 'FK': 'Falkland Islands', 'FM': 'Micronesia', 'FO': 'Faroe Islands', 'FR': 'France',
    'GA': 'Gabon', 'GB': 'United Kingdom', 'GD': 'Grenada', 'GE': 'Georgia', 'GF': 'French Guiana',
    'GG': 'Guernsey', 'GH': 'Ghana', 'GI': 'Gibraltar', 'GL': 'Greenland', 'GM': 'Gambia',
    'GN': 'Guinea', 'GP': 'Guadeloupe', 'GQ': 'Equatorial Guinea', 'GR': 'Greece', 'GS': 'South Georgia',
    'GT': 'Guatemala', 'GU': 'Guam', 'GW': 'Guinea-Bissau', 'GY': 'Guyana', 'HK': 'Hong Kong',
    'HM': 'Heard Island', 'HN': 'Honduras', 'HR': 'Croatia', 'HT': 'Haiti', 'HU': 'Hungary',
    'ID': 'Indonesia', 'IE': 'Ireland', 'IL': 'Israel', 'IM': 'Isle of Man', 'IN': 'India',
    'IO': 'British Indian Ocean Territory', 'IQ': 'Iraq', 'IR': 'Iran', 'IS': 'Iceland', 'IT': 'Italy',
    'JE': 'Jersey', 'JM': 'Jamaica', 'JO': 'Jordan', 'JP': 'Japan', 'KE': 'Kenya', 'KG': 'Kyrgyzstan',
    'KH': 'Cambodia', 'KI': 'Kiribati', 'KM': 'Comoros', 'KN': 'Saint Kitts and Nevis', 'KP': 'Korea, North',
    'KR': 'Korea, South', 'KW': 'Kuwait', 'KY': 'Cayman Islands', 'KZ': 'Kazakhstan', 'LA': 'Laos',
    'LB': 'Lebanon', 'LC': 'Saint Lucia', 'LI': 'Liechtenstein', 'LK': 'Sri Lanka', 'LR': 'Liberia',
    'LS': 'Lesotho', 'LT': 'Lithuania', 'LU': 'Luxembourg', 'LV': 'Latvia', 'LY': 'Libya',
    'MA': 'Morocco', 'MC': 'Monaco', 'MD': 'Moldova', 'ME': 'Montenegro', 'MF': 'Saint Martin',
    'MG': 'Madagascar', 'MH': 'Marshall Islands', 'MK': 'North Macedonia', 'ML': 'Mali', 'MM': 'Myanmar',
    'MN': 'Mongolia', 'MO': 'Macao', 'MP': 'Northern Mariana Islands', 'MQ': 'Martinique', 'MR': 'Mauritania',
    'MS': 'Montserrat', 'MT': 'Malta', 'MU': 'Mauritius', 'MV': 'Maldives', 'MW': 'Malawi',
    'MX': 'Mexico', 'MY': 'Malaysia', 'MZ': 'Mozambique', 'NA': 'Namibia', 'NC': 'New Caledonia',
    'NE': 'Niger', 'NF': 'Norfolk Island', 'NG': 'Nigeria', 'NI': 'Nicaragua', 'NL': 'Netherlands',
    'NO': 'Norway', 'NP': 'Nepal', 'NR': 'Nauru', 'NU': 'Niue', 'NZ': 'New Zealand', 'OM': 'Oman',
    'PA': 'Panama', 'PE': 'Peru', 'PF': 'French Polynesia', 'PG': 'Papua New Guinea', 'PH': 'Philippines',
    'PK': 'Pakistan', 'PL': 'Poland', 'PM': 'Saint Pierre and Miquelon', 'PN': 'Pitcairn', 'PR': 'Puerto Rico',
    'PS': 'Palestine', 'PT': 'Portugal', 'PW': 'Palau', 'PY': 'Paraguay', 'QA': 'Qatar', 'RE': 'Réunion',
    'RO': 'Romania', 'RS': 'Serbia', 'RU': 'Russia', 'RW': 'Rwanda', 'SA': 'Saudi Arabia', 'SB': 'Solomon Islands',
    'SC': 'Seychelles', 'SD': 'Sudan', 'SE': 'Sweden', 'SG': 'Singapore', 'SH': 'Saint Helena',
    'SI': 'Slovenia', 'SJ': 'Svalbard', 'SK': 'Slovakia', 'SL': 'Sierra Leone', 'SM': 'San Marino',
    'SN': 'Senegal', 'SO': 'Somalia', 'SR': 'Suriname', 'SS': 'South Sudan', 'ST': 'Sao Tome and Principe',
    'SV': 'El Salvador', 'SX': 'Sint Maarten', 'SY': 'Syria', 'SZ': 'Eswatini', 'TC': 'Turks and Caicos',
    'TD': 'Chad', 'TF': 'French Southern Territories', 'TG': 'Togo', 'TH': 'Thailand', 'TJ': 'Tajikistan',
    'TK': 'Tokelau', 'TL': 'Timor-Leste', 'TM': 'Turkmenistan', 'TN': 'Tunisia', 'TO': 'Tonga',
    'TR': 'Turkey', 'TT': 'Trinidad and Tobago', 'TV': 'Tuvalu', 'TW': 'Taiwan', 'TZ': 'Tanzania',
    'UA': 'Ukraine', 'UG': 'Uganda', 'UM': 'United States Minor Outlying Islands', 'US': 'United States',
    'UY': 'Uruguay', 'UZ': 'Uzbekistan', 'VA': 'Vatican City', 'VC': 'Saint Vincent and the Grenadines',
    'VE': 'Venezuela', 'VG': 'British Virgin Islands', 'VI': 'U.S. Virgin Islands', 'VN': 'Vietnam',
    'VU': 'Vanuatu', 'WF': 'Wallis and Futuna', 'WS': 'Samoa', 'YE': 'Yemen', 'YT': 'Mayotte',
    'ZA': 'South Africa', 'ZM': 'Zambia', 'ZW': 'Zimbabwe'
};

// Convert country code to full country name
function getCountryNameFromCode(code) {
    if (!code) return '';
    const upperCode = code.toUpperCase();
    return isoToCountryName[upperCode] || code;
}

// Get country data from URL
const urlParams = new URLSearchParams(window.location.search);
let countryNameFromUrl = urlParams.get('country') || 'Afghanistan';
const countryCodeFromUrl = urlParams.get('code') || 'AF';

// Если name является кодом страны (2 буквы), преобразуем в полное название
if (!countryNameFromUrl || countryNameFromUrl.length === 2 || (countryCodeFromUrl && countryNameFromUrl === countryCodeFromUrl)) {
    countryNameFromUrl = getCountryNameFromCode(countryCodeFromUrl || countryNameFromUrl);
    console.log('[Plans] Converted country code to name:', {
        code: countryCodeFromUrl,
        originalName: urlParams.get('country'),
        convertedName: countryNameFromUrl
    });
}

const countryData = {
    name: countryNameFromUrl,
    code: countryCodeFromUrl
};

// Plans data - загружаются динамически из API
let standardPlans = [];
let unlimitedPlans = [];

// Функция загрузки планов из API
async function loadPlansFromAPI(countryCode) {
    console.log('🔵 loadPlansFromAPI called with countryCode:', countryCode);
    
    try {
        const params = new URLSearchParams();
        if (countryCode) {
            params.append('country', countryCode);
            // Явно указываем category=local для Local планов
            params.append('category', 'local');
        }
        
        const apiUrl = `/api/esimgo/plans?${params.toString()}`;
        console.log('🔵 Fetching plans from:', apiUrl);
        
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
            unlimitedPlans = result.data.unlimited || [];
            
            // Проверяем, что планы имеют цены
            const plansWithoutPrice = [...standardPlans, ...unlimitedPlans].filter(p => !p.price || p.priceValue === 0 || p.price === '$ 0.00');
            if (plansWithoutPrice.length > 0) {
                console.warn('⚠️ Found plans without valid prices:', plansWithoutPrice.length);
                console.warn('Sample plans without price:', plansWithoutPrice.slice(0, 3));
            }
            
            // Добавляем ID для совместимости
            standardPlans.forEach((plan, index) => {
                if (!plan.id) {
                    plan.id = `plan${index + 1}`;
                }
                // Проверяем, что цена есть
                if (!plan.price || plan.priceValue === 0) {
                    console.error('❌ Plan without price:', plan);
                }
            });
            
            unlimitedPlans.forEach((plan, index) => {
                if (!plan.id) {
                    plan.id = `unlimited${index + 1}`;
                }
                // Проверяем, что цена есть
                if (!plan.price || plan.priceValue === 0) {
                    console.error('❌ Unlimited plan without price:', plan);
                }
            });
            
            console.log('Plans loaded from API:', {
                standard: standardPlans.length,
                unlimited: unlimitedPlans.length,
                country: countryCode,
                sampleStandard: standardPlans[0] || null,
                sampleUnlimited: unlimitedPlans[0] || null,
                plansWithoutPrice: plansWithoutPrice.length
            });
            
            // Логируем первые планы для отладки с ценами
            if (standardPlans.length > 0) {
                console.log('✅ First standard plan:', {
                    name: standardPlans[0].bundle_name,
                    price: standardPlans[0].price,
                    priceValue: standardPlans[0].priceValue,
                    currency: standardPlans[0].currency,
                    data: standardPlans[0].data,
                    duration: standardPlans[0].duration
                });
            }
            if (unlimitedPlans.length > 0) {
                console.log('✅ First unlimited plan:', {
                    name: unlimitedPlans[0].bundle_name,
                    price: unlimitedPlans[0].price,
                    priceValue: unlimitedPlans[0].priceValue,
                    currency: unlimitedPlans[0].currency,
                    duration: unlimitedPlans[0].duration
                });
            }
            
            // Если планы загружены, но все без цен - это проблема
            if (standardPlans.length > 0 && plansWithoutPrice.length === standardPlans.length + unlimitedPlans.length) {
                console.error('❌ CRITICAL: All plans loaded but none have valid prices!');
                console.error('This might indicate a problem with price parsing from API');
            }
            
            // Если планы загружены, но все без цен - это проблема
            if (standardPlans.length === 0 && unlimitedPlans.length === 0) {
                console.warn('⚠️ API returned success but no plans found');
                console.warn('This might mean: 1) No bundles for this country, 2) All bundles filtered out, 3) API issue');
                // НЕ используем fallback - показываем пустой список
                return true;
            }
            
            return true;
        } else {
            console.warn('❌ Failed to load plans from API - result.success is false or no data');
            console.warn('Result:', result);
            // НЕ используем fallback - показываем пустой список
            standardPlans = [];
            unlimitedPlans = [];
            return false;
        }
    } catch (error) {
        console.error('❌ Error loading plans from API:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        // НЕ используем fallback - показываем пустой список вместо 9.99$
        standardPlans = [];
        unlimitedPlans = [];
        console.warn('⚠️ API error - showing empty plans list instead of fallback');
        return false;
    }
}

let currentPlanType = 'standard';
let selectedPlanId = 'plan2'; // Default selected for standard

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    setupCountryInfo();
    setupSegmentedControl();
    
    // Загружаем реальные планы из API
    console.log('🔵 Loading plans for country:', countryData.code);
    await loadPlansFromAPI(countryData.code);
    
    // Рендерим планы после загрузки
    renderPlans();
    updateInfoBox();
    setupNextButton();
    setupNavigation();
});

// Version for cache busting - increment when flags are updated
const FLAG_VERSION = 'v8'; // Updated: fix flag styling (rounded corners, proper sizing)

// Function to get flag image URL from local flags folder
// Using SVG format for maximum quality (vector, scales perfectly)
function getFlagPath(countryCode) {
    if (!countryCode) {
        return null;
    }
    // Use local SVG flags from flags folder
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

// Setup country info
function setupCountryInfo() {
    const flagElement = document.getElementById('countryFlag');
    const flagPath = getFlagPath(countryData.code);
    
    console.log('Country data:', countryData);
    console.log('Flag path:', flagPath);
    
    if (flagPath && flagElement) {
        // Use local flag image
        const img = document.createElement('img');
        img.src = flagPath;
        img.alt = `${countryData.name} flag`;
        img.className = 'country-flag-img';
        
        // Улучшенная обработка ошибок загрузки флага
        let retryCount = 0;
        img.onerror = function() {
            retryCount++;
            console.error(`❌ Failed to load flag (attempt ${retryCount}):`, flagPath);
            
            // Первая попытка: пробуем без версии кэша
            if (retryCount === 1) {
                const pathWithoutVersion = flagPath.split('?')[0];
                console.log('🔄 Retrying flag load without cache version:', pathWithoutVersion);
                img.src = pathWithoutVersion;
                return;
            }
            
            // Вторая попытка: пробуем альтернативные варианты для специальных стран
            if (retryCount === 2) {
                const code = countryData.code.toUpperCase();
                if (code === 'CYP') {
                    // Пробуем без точки с запятой и пробела
                    console.log('🔄 Retrying with alternative filename for CYP');
                    img.src = `/flags/CYP.svg?${FLAG_VERSION}`;
                    return;
                }
            }
            
            // Если все попытки не удались, используем emoji
            console.warn('⚠️ All flag load attempts failed, using emoji fallback');
            flagElement.innerHTML = '';
            flagElement.textContent = '🏳️';
        };
        
        img.onload = function() {
            console.log('✅ Flag loaded successfully:', flagPath);
        };
        
        flagElement.innerHTML = '';
        flagElement.appendChild(img);
    } else {
        // Fallback to emoji
        if (flagElement) {
            console.warn('⚠️ No flag path available, using emoji fallback');
            flagElement.textContent = '🏳️';
        }
    }
    
    const nameElement = document.getElementById('countryName');
    if (nameElement) {
        nameElement.textContent = countryData.name;
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

// Setup next button
function setupNextButton() {
    const nextBtn = document.getElementById('nextBtn');
    if (!nextBtn) {
        console.error('nextBtn element not found');
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
        
        // Navigate to checkout page
        const urlParams = new URLSearchParams(window.location.search);
        const extend = urlParams.get('extend');
        const iccid = urlParams.get('iccid');
        
        console.log('[Plans] 🔍 Extracting extend parameters from URL:', {
            extend: extend,
            iccid: iccid,
            hasExtend: extend === 'true',
            hasIccid: !!iccid,
            fullUrl: window.location.href
        });
        
        const checkoutParams = new URLSearchParams({
            type: 'country',
            code: countryData.code,
            name: countryData.name,
            plan: selectedPlanId,
            planType: currentPlanType
        });
        
        // Если это extend, добавляем параметры
        if (extend === 'true' && iccid) {
            checkoutParams.append('extend', 'true');
            checkoutParams.append('iccid', iccid);
            console.log('[Plans] 🔄 Extend mode: Adding extend parameters to checkout:', {
                extend: 'true',
                iccid: iccid,
                checkoutParams: checkoutParams.toString()
            });
        } else {
            console.log('[Plans] 📦 New eSIM mode (not extend):', {
                extend: extend,
                hasIccid: !!iccid,
                reason: !extend ? 'extend not in URL' : (!iccid ? 'iccid not in URL' : 'unknown')
            });
        }
        
        const checkoutUrl = `checkout.html?${checkoutParams.toString()}`;
        console.log('[Plans] 🚀 Navigating to checkout:', checkoutUrl);
        window.location.href = checkoutUrl;
    });
}

// Setup bottom navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach((item) => {
        item.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            
            const label = item.querySelector('.nav-label')?.textContent;
            
            if (label === 'Account') {
                window.location.href = 'account.html';
            } else if (label === 'Buy eSIM') {
                window.location.href = 'index.html';
            } else if (label === 'Help') {
                window.location.href = 'help.html';
            }
        });
    });
}
