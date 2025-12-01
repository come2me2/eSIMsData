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
// Using SVG format for maximum quality (vector, scales perfectly)
// This function is defined later in the file to avoid duplication

// Old mapping removed - using CDN now
const countryFlagMap = {
    'AD': 1,   // Andorra
    'AE': 2,   // United Arab Emirates
    'AF': 3,   // Afghanistan
    'AG': 4,   // Antigua and Barbuda
    'AI': 5,   // Anguilla
    'AL': 6,   // Albania
    'AM': 7,   // Armenia
    'AO': 8,   // Angola
    'AQ': 9,   // Antarctica
    'AR': 10,  // Argentina
    'AS': 11,  // American Samoa
    'AT': 12,  // Austria
    'AU': 13,  // Australia
    'AW': 14,  // Aruba
    'AX': 15,  // Åland Islands
    'AZ': 16,  // Azerbaijan
    'BA': 17,  // Bosnia and Herzegovina
    'BB': 18,  // Barbados
    'BD': 19,  // Bangladesh
    'BE': 20,  // Belgium
    'BF': 21,  // Burkina Faso
    'BG': 22,  // Bulgaria
    'BH': 23,  // Bahrain
    'BI': 24,  // Burundi
    'BJ': 25,  // Benin
    'BL': 26,  // Saint Barthélemy
    'BM': 27,  // Bermuda
    'BN': 28,  // Brunei
    'BO': 29,  // Bolivia
    'BQ': 30,  // Caribbean Netherlands
    'BR': 31,  // Brazil
    'BS': 32,  // Bahamas
    'BT': 33,  // Bhutan
    'BV': 34,  // Bouvet Island
    'BW': 35,  // Botswana
    'BY': 36,  // Belarus
    'BZ': 37,  // Belize
    'CA': 38,  // Canada
    'CC': 39,  // Cocos Islands
    'CD': 40,  // Congo, Democratic Republic
    'CF': 41,  // Central African Republic
    'CG': 42,  // Congo
    'CH': 43,  // Switzerland
    'CI': 44,  // Côte d'Ivoire
    'CK': 45,  // Cook Islands
    'CL': 46,  // Chile
    'CM': 47,  // Cameroon
    'CN': 48,  // China
    'CO': 49,  // Colombia
    'CR': 50,  // Costa Rica
    'CU': 51,  // Cuba
    'CV': 52,  // Cabo Verde
    'CW': 53,  // Curaçao
    'CX': 54,  // Christmas Island
    'CY': 55,  // Cyprus
    'CZ': 56,  // Czech Republic
    'DE': 57,  // Germany
    'DJ': 58,  // Djibouti
    'DK': 59,  // Denmark
    'DM': 60,  // Dominica
    'DO': 61,  // Dominican Republic
    'DZ': 62,  // Algeria
    'EC': 63,  // Ecuador
    'EE': 64,  // Estonia
    'EG': 65,  // Egypt
    'EH': 66,  // Western Sahara
    'ER': 67,  // Eritrea
    'ES': 68,  // Spain
    'ET': 69,  // Ethiopia
    'FI': 70,  // Finland
    'FJ': 71,  // Fiji
    'FK': 72,  // Falkland Islands
    'FM': 73,  // Micronesia
    'FO': 74,  // Faroe Islands
    'FR': 75,  // France
    'GA': 76,  // Gabon
    'GB': 77,  // United Kingdom
    'GD': 78,  // Grenada
    'GE': 79,  // Georgia
    'GF': 80,  // French Guiana
    'GG': 81,  // Guernsey
    'GH': 82,  // Ghana
    'GI': 83,  // Gibraltar
    'GL': 84,  // Greenland
    'GM': 85,  // Gambia
    'GN': 86,  // Guinea
    'GP': 87,  // Guadeloupe
    'GQ': 88,  // Equatorial Guinea
    'GR': 89,  // Greece
    'GS': 90,  // South Georgia
    'GT': 91,  // Guatemala
    'GU': 92,  // Guam
    'GW': 93,  // Guinea-Bissau
    'GY': 94,  // Guyana
    'HK': 95,  // Hong Kong
    'HM': 96,  // Heard Island
    'HN': 97,  // Honduras
    'HR': 98,  // Croatia
    'HT': 99,  // Haiti
    'HU': 100, // Hungary
    'ID': 101, // Indonesia
    'IE': 102, // Ireland
    'IL': 103, // Israel
    'IM': 104, // Isle of Man
    'IN': 105, // India
    'IO': 106, // British Indian Ocean Territory
    'IQ': 107, // Iraq
    'IR': 108, // Iran
    'IS': 109, // Iceland
    'IT': 110, // Italy
    'JE': 111, // Jersey
    'JM': 112, // Jamaica
    'JO': 113, // Jordan
    'JP': 114, // Japan
    'KE': 115, // Kenya
    'KG': 116, // Kyrgyzstan
    'KH': 117, // Cambodia
    'KI': 118, // Kiribati
    'KM': 119, // Comoros
    'KN': 120, // Saint Kitts and Nevis
    'KP': 121, // Korea, North
    'KR': 122, // Korea, South
    'KW': 123, // Kuwait
    'KY': 124, // Cayman Islands
    'KZ': 125, // Kazakhstan
    'LA': 126, // Laos
    'LB': 127, // Lebanon
    'LC': 128, // Saint Lucia
    'LI': 129, // Liechtenstein
    'LK': 130, // Sri Lanka
    'LR': 131, // Liberia
    'LS': 132, // Lesotho
    'LT': 133, // Lithuania
    'LU': 134, // Luxembourg
    'LV': 135, // Latvia
    'LY': 136, // Libya
    'MA': 137, // Morocco
    'MC': 138, // Monaco
    'MD': 139, // Moldova
    'ME': 140, // Montenegro
    'MF': 141, // Saint Martin
    'MG': 142, // Madagascar
    'MH': 143, // Marshall Islands
    'MK': 144, // North Macedonia
    'ML': 145, // Mali
    'MM': 146, // Myanmar
    'MN': 147, // Mongolia
    'MO': 148, // Macao
    'MP': 149, // Northern Mariana Islands
    'MQ': 150, // Martinique
    'MR': 151, // Mauritania
    'MS': 152, // Montserrat
    'MT': 153, // Malta
    'MU': 154, // Mauritius
    'MV': 155, // Maldives
    'MW': 156, // Malawi
    'MX': 157, // Mexico
    'MY': 158, // Malaysia
    'MZ': 159, // Mozambique
    'NA': 160, // Namibia
    'NC': 161, // New Caledonia
    'NE': 162, // Niger
    'NF': 163, // Norfolk Island
    'NG': 164, // Nigeria
    'NI': 165, // Nicaragua
    'NL': 166, // Netherlands
    'NO': 167, // Norway
    'NP': 168, // Nepal
    'NR': 169, // Nauru
    'NU': 170, // Niue
    'NZ': 171, // New Zealand
    'OM': 172, // Oman
    'PA': 173, // Panama
    'PE': 174, // Peru
    'PF': 175, // French Polynesia
    'PG': 176, // Papua New Guinea
    'PH': 177, // Philippines
    'PK': 178, // Pakistan
    'PL': 179, // Poland
    'PM': 180, // Saint Pierre and Miquelon
    'PN': 181, // Pitcairn
    'PR': 182, // Puerto Rico
    'PS': 183, // Palestine
    'PT': 184, // Portugal
    'PW': 185, // Palau
    'PY': 186, // Paraguay
    'QA': 187, // Qatar
    'RE': 188, // Réunion
    'RO': 189, // Romania
    'RS': 190, // Serbia
    'RU': 191, // Russia
    'RW': 192, // Rwanda
    'SA': 193, // Saudi Arabia
    'SB': 194, // Solomon Islands
    'SC': 195, // Seychelles
    'SD': 196, // Sudan
    'SE': 197, // Sweden
    'SG': 198, // Singapore
    'SH': 199, // Saint Helena
    'TH': 173, // Thailand (approximate position based on ISO order)
};

// Function to get flag image URL from local flags folder
function getFlagPath(countryCode) {
    if (!countryCode) {
        return null;
    }
    // Use local SVG flags from flags folder
    // Format: flags/{code}.svg (SVG scales perfectly)
    const code = countryCode.toLowerCase();
    
    // Determine base path - works both locally and on Vercel
    // On Vercel, files are served from root, so we need absolute path
    // For local development, relative path works
    const isVercel = window.location.hostname.includes('vercel.app') || 
                     window.location.hostname.includes('vercel.com');
    
    if (isVercel) {
        // Absolute path for Vercel
        return `/flags/${code}.svg`;
    } else {
        // Relative path for local development
        return `flags/${code}.svg`;
    }
}

// Country data
const countries = [
    { name: 'Afghanistan', code: 'AF' },
    { name: 'Thailand', code: 'TH' },
    { name: 'China', code: 'CN' },
    { name: 'Spain', code: 'ES' },
    { name: 'Indonesia', code: 'ID' },
];

// Region icon file mapping
const regionIconMap = {
    'Africa': 'Afrrica.png', // Note: filename has typo "Afrrica"
    'Asia': 'Asia.png',
    'Europe': 'Europe.png',
    'Latin America': 'Latin America.png',
    'North America': 'North America.png',
    'Balkanas': 'Balkanas.png',
    'Central Eurasia': 'Central Eurasia.png',
    'Oceania': 'Oceania.png'
};

const regions = [
    { name: 'Africa' },
    { name: 'Asia' },
    { name: 'Europe' },
    { name: 'Latin America' },
    { name: 'North America' },
    { name: 'Balkanas' },
    { name: 'Central Eurasia' },
    { name: 'Oceania' },
];

// Get segment from URL or default to 'region'
const urlParams = new URLSearchParams(window.location.search);
let currentSegment = urlParams.get('segment') || 'region';

// Initialize app with optimized loading
document.addEventListener('DOMContentLoaded', () => {
    // Telegram Auth - проверка авторизации
    const auth = window.telegramAuth;
    if (auth && auth.isAuthenticated()) {
        const userId = auth.getUserId();
        const userName = auth.getUserName();
        console.log('✅ User authenticated:', userId, userName);
        
        // Можно использовать userId для загрузки персональных данных
        // Например, сохранить в глобальной переменной для использования
        window.currentUserId = userId;
        window.currentUserName = userName;
        
        // Обновить индикатор авторизации
        const authIndicator = document.getElementById('authIndicator');
        if (authIndicator) {
            authIndicator.style.background = '#4CAF50';
            authIndicator.title = `Авторизован: ${userName} (ID: ${userId})`;
        }
    } else {
        console.warn('⚠️ User not authenticated');
        
        // Обновить индикатор авторизации
        const authIndicator = document.getElementById('authIndicator');
        if (authIndicator) {
            authIndicator.style.background = '#FF9800';
            authIndicator.title = 'Не авторизован. Откройте через Telegram WebApp.';
        }
    }
    
    // Critical operations - execute immediately
    const segmentButtons = document.querySelectorAll('.segment-btn');
    segmentButtons.forEach(btn => {
        if (btn.dataset.segment === currentSegment) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    updateContent();
    setupSegmentedControl();
    setupNavigation();
    
    // Non-critical operations - execute when idle
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            setupSearch();
        }, { timeout: 2000 });
    } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(setupSearch, 100);
    }
});

// Render country list
function renderCountries(filteredCountries = countries) {
    const countryList = document.getElementById('countryList');
    const emptyState = document.getElementById('emptyState');
    countryList.innerHTML = '';
    
    // Show empty state if no results
    if (filteredCountries.length === 0) {
        countryList.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'flex';
        }
        return;
    }
    
    // Hide empty state and show list
    countryList.style.display = 'flex';
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    filteredCountries.forEach(country => {
        const countryItem = document.createElement('div');
        countryItem.className = 'country-item';
        
        const flagPath = getFlagPath(country.code);
        
        // Создаем элемент флага
        let flagElement;
        if (flagPath) {
            const flagImg = document.createElement('img');
            flagImg.src = flagPath;
            flagImg.alt = `${country.name} flag`;
            flagImg.className = 'country-flag';
            
            // Обработка ошибки загрузки - заменяем на эмодзи флаг
            flagImg.onerror = function() {
                console.warn(`Failed to load flag for ${country.name} (${country.code}): ${flagPath}`);
                const emojiFlag = document.createElement('span');
                emojiFlag.className = 'country-flag';
                emojiFlag.textContent = '🏳️';
                this.parentNode.replaceChild(emojiFlag, this);
            };
            
            // Логирование для отладки (можно убрать после проверки)
            flagImg.onload = function() {
                console.log(`Flag loaded successfully: ${flagPath}`);
            };
            
            flagElement = flagImg;
        } else {
            const emojiFlag = document.createElement('span');
            emojiFlag.className = 'country-flag';
            emojiFlag.textContent = '🏳️';
            flagElement = emojiFlag;
        }
        
        const countryName = document.createElement('span');
        countryName.className = 'country-name';
        countryName.textContent = country.name;
        
        const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        chevron.setAttribute('class', 'country-chevron');
        chevron.setAttribute('width', '8');
        chevron.setAttribute('height', '14');
        chevron.setAttribute('viewBox', '0 0 8 14');
        chevron.setAttribute('fill', 'none');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M1 1L7 7L1 13');
        path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', '1.5');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        chevron.appendChild(path);
        
        countryItem.appendChild(flagElement);
        countryItem.appendChild(countryName);
        countryItem.appendChild(chevron);
        
        countryItem.addEventListener('click', () => {
            handleCountryClick(country);
        });
        
        countryList.appendChild(countryItem);
    });
}

// Setup segmented control
function setupSegmentedControl() {
    const segmentButtons = document.querySelectorAll('.segment-btn');
    
    segmentButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            segmentButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            
            currentSegment = btn.dataset.segment;
            updateContent();
        });
    });
}

// Update content based on current segment
function updateContent() {
    const sectionHeader = document.getElementById('sectionHeader');
    const regionList = document.getElementById('regionList');
    const countryList = document.getElementById('countryList');
    
    const headers = {
        region: 'Region eSIM for multiple countries',
        local: 'Local eSIM for one country',
        global: 'Global eSIM for worldwide coverage'
    };
    
    if (sectionHeader) {
        sectionHeader.textContent = headers[currentSegment] || headers.local;
    }
    
    if (currentSegment === 'region') {
        if (regionList) regionList.style.display = 'flex';
        if (countryList) countryList.style.display = 'none';
        renderRegions();
    } else if (currentSegment === 'global') {
        // Navigate to global plans screen
        window.location.href = 'global-plans.html';
    } else {
        if (regionList) regionList.style.display = 'none';
        if (countryList) countryList.style.display = 'flex';
        renderCountries();
    }
}

// Render region list
function renderRegions(filteredRegions = regions) {
    const regionList = document.getElementById('regionList');
    const emptyState = document.getElementById('emptyState');
    if (!regionList) return;
    
    regionList.innerHTML = '';
    
    // Show empty state if no results
    if (filteredRegions.length === 0) {
        regionList.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'flex';
        }
        return;
    }
    
    // Hide empty state and show list
    regionList.style.display = 'flex';
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    filteredRegions.forEach(region => {
        const regionItem = document.createElement('div');
        regionItem.className = 'region-item';
        
        const iconFileName = regionIconMap[region.name] || 'Africa.png';
        const iconPath = `Region/${iconFileName}`;
        
        regionItem.innerHTML = `
            <div class="region-icon">
                <img src="${iconPath}" alt="${region.name} icon" class="region-icon-img">
            </div>
            <span class="region-name">${region.name}</span>
            <svg class="region-chevron" width="8" height="14" viewBox="0 0 8 14" fill="none">
                <path d="M1 1L7 7L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        
        regionItem.addEventListener('click', () => {
            handleRegionClick(region);
        });
        
        regionList.appendChild(regionItem);
    });
}

// Setup search functionality with debounce
function setupSearch() {
    const searchInput = document.querySelector('.search-input');
    
    if (!searchInput) return;
    
    // Use debounce for better performance
    const debouncedSearch = window.debounce ? window.debounce((query) => {
        if (query === '') {
            updateContent();
            return;
        }
        
        if (currentSegment === 'region') {
            const filtered = regions.filter(region => 
                region.name.toLowerCase().includes(query)
            );
            renderRegions(filtered);
        } else {
            const filtered = countries.filter(country => 
                country.name.toLowerCase().includes(query)
            );
            renderCountries(filtered);
        }
    }, 150) : (query) => {
        if (query === '') {
            updateContent();
            return;
        }
        
        if (currentSegment === 'region') {
            const filtered = regions.filter(region => 
                region.name.toLowerCase().includes(query)
            );
            renderRegions(filtered);
        } else {
            const filtered = countries.filter(country => 
                country.name.toLowerCase().includes(query)
            );
            renderCountries(filtered);
        }
    };
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        debouncedSearch(query);
    });
}

// Setup bottom navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            navItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');
            
            const label = item.querySelector('.nav-label').textContent;
            handleNavigationClick(label);
        });
    });
}

// Handle region click
function handleRegionClick(region) {
    if (tg) {
        tg.HapticFeedback.impactOccurred('light');
    }
    // Navigate to region plans page
    const params = new URLSearchParams({
        region: region.name
    });
    window.location.href = `region-plans.html?${params.toString()}`;
}

// Handle country click
function handleCountryClick(country) {
    if (tg) {
        tg.HapticFeedback.impactOccurred('light');
    }
    // Navigate to plans page with country data
    const params = new URLSearchParams({
        country: country.name,
        code: country.code
    });
    window.location.href = `plans.html?${params.toString()}`;
}

// Handle navigation click
function handleNavigationClick(section) {
    if (tg) {
        tg.HapticFeedback.impactOccurred('light');
    }
    
    // Use optimized navigation if available
    const navigate = window.optimizedNavigate || ((url) => { window.location.href = url; });
    
    // Navigate to different sections
    if (section === 'Account') {
        navigate('account.html');
    } else if (section === 'Buy eSIM') {
        // Already on Buy eSIM page
        return;
    } else if (section === 'Help') {
        navigate('help.html');
    }
}

// Cancel button handler
document.querySelector('.cancel-btn')?.addEventListener('click', () => {
    if (tg) {
        tg.close();
    } else {
        // Fallback for testing outside Telegram
        console.log('Close app');
    }
});

