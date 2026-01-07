// Telegram Web App initialization
let tg = window.Telegram.WebApp;

// Немедленно скрываем BackButton при загрузке скрипта (до инициализации)
// Это важно, так как предыдущая страница могла показать BackButton
if (tg && tg.BackButton) {
    tg.BackButton.hide();
    console.log('🔙 BackButton скрыта немедленно при загрузке скрипта');
}

// Функция для скрытия BackButton (показываем Close)
// На странице local-countries.html всегда скрываем BackButton
function hideBackButton() {
    // Обновляем ссылку на tg, так как она может измениться
    tg = window.Telegram?.WebApp;
    
    if (tg && tg.BackButton) {
        // Всегда скрываем BackButton на странице Local (показываем Close)
        tg.BackButton.hide();
        console.log('🔙 BackButton скрыта (Local страница - показываем Close)', {
            pathname: window.location.pathname,
            href: window.location.href,
            isVisible: tg.BackButton.isVisible
        });
    }
}

// Initialize Telegram Web App
if (tg) {
    tg.ready();
    tg.expand();
    
    // Set theme colors
    tg.setHeaderColor('#FFFFFF');
    tg.setBackgroundColor('#F2F2F7');
    
    // На странице Local всегда скрываем BackButton (показываем Close)
    // Делаем это сразу и несколько раз для надежности
    hideBackButton();
    setTimeout(hideBackButton, 0);
    setTimeout(hideBackButton, 50);
    setTimeout(hideBackButton, 100);
    setTimeout(hideBackButton, 200);
}

// Flag version for cache busting
const FLAG_VERSION = 'v8'; // Updated: fix flag styling (rounded corners, proper sizing)

// Function to get flag image URL
function getFlagPath(countryCode) {
    if (!countryCode) {
        return null;
    }
    let code = countryCode.toUpperCase();
    
    // Специальная обработка для файлов с пробелами или специальными символами
    const specialFlagFiles = {
        'CYP': 'CYP;CY .svg',  // Northern Cyprus файл с пробелом
        'US-HI': 'US-HI .svg'  // Hawaii файл с пробелом
    };
    
    if (specialFlagFiles[code]) {
        const fileName = specialFlagFiles[code];
        const encodedFileName = encodeURIComponent(fileName);
        return `/flags/${encodedFileName}?${FLAG_VERSION}`;
    }
    
    return `/flags/${code}.svg?${FLAG_VERSION}`;
}

// Статичный список всех стран с кодами (для мгновенного отображения при первом запуске)
// Этот список будет показан пользователю сразу, до загрузки из API
const staticCountries = [
    { name: 'Åland Islands', code: 'AX' }, { name: 'Albania', code: 'AL' },
    { name: 'Algeria', code: 'DZ' }, { name: 'Andorra', code: 'AD' }, { name: 'Angola', code: 'AO' },
    { name: 'Anguilla', code: 'AI' }, { name: 'Antigua and Barbuda', code: 'AG' }, { name: 'Argentina', code: 'AR' },
    { name: 'Armenia', code: 'AM' }, { name: 'Australia', code: 'AU' }, { name: 'Austria', code: 'AT' },
    { name: 'Azerbaijan', code: 'AZ' }, { name: 'Bahamas', code: 'BS' }, { name: 'Bahrain', code: 'BH' },
    { name: 'Bangladesh', code: 'BD' }, { name: 'Barbados', code: 'BB' }, { name: 'Belgium', code: 'BE' },
    { name: 'Belize', code: 'BZ' }, { name: 'Bermuda', code: 'BM' }, { name: 'Bhutan', code: 'BT' },
    { name: 'Bolivia', code: 'BO' }, { name: 'Bosnia and Herzegovina', code: 'BA' }, { name: 'Botswana', code: 'BW' },
    { name: 'Brazil', code: 'BR' }, { name: 'Brunei', code: 'BN' }, { name: 'Bulgaria', code: 'BG' },
    { name: 'Burkina Faso', code: 'BF' }, { name: 'Burundi', code: 'BI' }, { name: 'Cabo Verde', code: 'CV' },
    { name: 'Cambodia', code: 'KH' }, { name: 'Cameroon', code: 'CM' }, { name: 'Canada', code: 'CA' },
    { name: 'Canary Islands', code: 'IC' }, { name: 'Cayman Islands', code: 'KY' }, { name: 'Chad', code: 'TD' },
    { name: 'Chile', code: 'CL' }, { name: 'China', code: 'CN' }, { name: 'Christmas Island', code: 'CX' },
    { name: 'Cocos Islands', code: 'CC' }, { name: 'Colombia', code: 'CO' }, { name: 'Comoros', code: 'KM' },
    { name: 'Congo', code: 'CG' }, { name: 'Congo, Democratic Republic', code: 'CD' }, { name: 'Cook Islands', code: 'CK' },
    { name: 'Costa Rica', code: 'CR' }, { name: 'Côte d\'Ivoire', code: 'CI' }, { name: 'Croatia', code: 'HR' },
    { name: 'Cuba', code: 'CU' }, { name: 'Curaçao', code: 'CW' }, { name: 'Cyprus', code: 'CY' },
    { name: 'Czech Republic', code: 'CZ' }, { name: 'Denmark', code: 'DK' }, { name: 'Djibouti', code: 'DJ' },
    { name: 'Dominica', code: 'DM' }, { name: 'Dominican Republic', code: 'DO' }, { name: 'Ecuador', code: 'EC' },
    { name: 'Egypt', code: 'EG' }, { name: 'El Salvador', code: 'SV' }, { name: 'Eritrea', code: 'ER' },
    { name: 'Estonia', code: 'EE' }, { name: 'Eswatini', code: 'SZ' }, { name: 'Ethiopia', code: 'ET' },
    { name: 'Falkland Islands', code: 'FK' }, { name: 'Faroe Islands', code: 'FO' }, { name: 'Fiji', code: 'FJ' },
    { name: 'Finland', code: 'FI' }, { name: 'France', code: 'FR' }, { name: 'French Guiana', code: 'GF' },
    { name: 'French Polynesia', code: 'PF' }, { name: 'French Southern Territories', code: 'TF' }, { name: 'Gabon', code: 'GA' },
    { name: 'Gambia', code: 'GM' }, { name: 'Georgia', code: 'GE' }, { name: 'Germany', code: 'DE' },
    { name: 'Ghana', code: 'GH' }, { name: 'Gibraltar', code: 'GI' }, { name: 'Greece', code: 'GR' },
    { name: 'Greenland', code: 'GL' }, { name: 'Grenada', code: 'GD' }, { name: 'Guadeloupe', code: 'GP' },
    { name: 'Guam', code: 'GU' }, { name: 'Guatemala', code: 'GT' }, { name: 'Guernsey', code: 'GG' },
    { name: 'Guinea', code: 'GN' }, { name: 'Guinea-Bissau', code: 'GW' }, { name: 'Guyana', code: 'GY' },
    { name: 'Haiti', code: 'HT' }, { name: 'Hawaii', code: 'US-HI' }, { name: 'Heard Island', code: 'HM' },
    { name: 'Honduras', code: 'HN' }, { name: 'Hong Kong', code: 'HK' }, { name: 'Hungary', code: 'HU' },
    { name: 'Iceland', code: 'IS' }, { name: 'India', code: 'IN' }, { name: 'Indonesia', code: 'ID' },
    { name: 'Iran', code: 'IR' }, { name: 'Iraq', code: 'IQ' }, { name: 'Ireland', code: 'IE' },
    { name: 'Isle of Man', code: 'IM' }, { name: 'Israel', code: 'IL' }, { name: 'Italy', code: 'IT' },
    { name: 'Jamaica', code: 'JM' }, { name: 'Japan', code: 'JP' }, { name: 'Jersey', code: 'JE' },
    { name: 'Jordan', code: 'JO' }, { name: 'Kazakhstan', code: 'KZ' }, { name: 'Kenya', code: 'KE' },
    { name: 'Kiribati', code: 'KI' }, { name: 'Kosovo', code: 'XK' }, { name: 'Kuwait', code: 'KW' },
    { name: 'Kyrgyzstan', code: 'KG' }, { name: 'Laos', code: 'LA' }, { name: 'Latvia', code: 'LV' },
    { name: 'Lebanon', code: 'LB' }, { name: 'Lesotho', code: 'LS' }, { name: 'Liberia', code: 'LR' },
    { name: 'Libya', code: 'LY' }, { name: 'Liechtenstein', code: 'LI' }, { name: 'Lithuania', code: 'LT' },
    { name: 'Luxembourg', code: 'LU' }, { name: 'Macao', code: 'MO' }, { name: 'Madagascar', code: 'MG' },
    { name: 'Malawi', code: 'MW' }, { name: 'Malaysia', code: 'MY' }, { name: 'Maldives', code: 'MV' },
    { name: 'Mali', code: 'ML' }, { name: 'Malta', code: 'MT' }, { name: 'Marshall Islands', code: 'MH' },
    { name: 'Martinique', code: 'MQ' }, { name: 'Mauritania', code: 'MR' }, { name: 'Mauritius', code: 'MU' },
    { name: 'Mayotte', code: 'YT' }, { name: 'Mexico', code: 'MX' }, { name: 'Micronesia', code: 'FM' },
    { name: 'Moldova', code: 'MD' }, { name: 'Monaco', code: 'MC' }, { name: 'Mongolia', code: 'MN' },
    { name: 'Montenegro', code: 'ME' }, { name: 'Montserrat', code: 'MS' }, { name: 'Morocco', code: 'MA' },
    { name: 'Mozambique', code: 'MZ' }, { name: 'Myanmar', code: 'MM' }, { name: 'Namibia', code: 'NA' },
    { name: 'Nepal', code: 'NP' }, { name: 'Netherlands', code: 'NL' }, { name: 'New Caledonia', code: 'NC' },
    { name: 'New Zealand', code: 'NZ' }, { name: 'Nicaragua', code: 'NI' }, { name: 'Niger', code: 'NE' },
    { name: 'Nigeria', code: 'NG' }, { name: 'Niue', code: 'NU' }, { name: 'North Macedonia', code: 'MK' },
    { name: 'Northern Cyprus', code: 'CYP' }, { name: 'Northern Mariana Islands', code: 'MP' }, { name: 'Norway', code: 'NO' },
    { name: 'Oman', code: 'OM' }, { name: 'Pakistan', code: 'PK' }, { name: 'Palau', code: 'PW' },
    { name: 'Palestine', code: 'PS' }, { name: 'Panama', code: 'PA' }, { name: 'Papua New Guinea', code: 'PG' },
    { name: 'Paraguay', code: 'PY' }, { name: 'Peru', code: 'PE' }, { name: 'Philippines', code: 'PH' },
    { name: 'Pitcairn', code: 'PN' }, { name: 'Poland', code: 'PL' }, { name: 'Portugal', code: 'PT' },
    { name: 'Puerto Rico', code: 'PR' }, { name: 'Qatar', code: 'QA' }, { name: 'Réunion', code: 'RE' },
    { name: 'Romania', code: 'RO' }, { name: 'Russia', code: 'RU' }, { name: 'Rwanda', code: 'RW' },
    { name: 'Saint Barthélemy', code: 'BL' }, { name: 'Saint Helena', code: 'SH' }, { name: 'Saint Kitts and Nevis', code: 'KN' },
    { name: 'Saint Lucia', code: 'LC' }, { name: 'Saint Martin', code: 'MF' }, { name: 'Saint Pierre and Miquelon', code: 'PM' },
    { name: 'Saint Vincent and the Grenadines', code: 'VC' }, { name: 'Samoa', code: 'WS' }, { name: 'San Marino', code: 'SM' },
    { name: 'São Tomé and Príncipe', code: 'ST' }, { name: 'Saudi Arabia', code: 'SA' }, { name: 'Senegal', code: 'SN' },
    { name: 'Serbia', code: 'RS' }, { name: 'Seychelles', code: 'SC' }, { name: 'Sierra Leone', code: 'SL' },
    { name: 'Singapore', code: 'SG' }, { name: 'Sint Maarten', code: 'SX' }, { name: 'Slovakia', code: 'SK' },
    { name: 'Slovenia', code: 'SI' }, { name: 'Solomon Islands', code: 'SB' }, { name: 'Somalia', code: 'SO' },
    { name: 'South Africa', code: 'ZA' }, { name: 'South Georgia', code: 'GS' }, { name: 'South Sudan', code: 'SS' },
    { name: 'Spain', code: 'ES' }, { name: 'Sri Lanka', code: 'LK' }, { name: 'Sudan', code: 'SD' },
    { name: 'Suriname', code: 'SR' }, { name: 'Svalbard and Jan Mayen', code: 'SJ' }, { name: 'Sweden', code: 'SE' },
    { name: 'Switzerland', code: 'CH' }, { name: 'Syria', code: 'SY' }, { name: 'Taiwan', code: 'TW' },
    { name: 'Tajikistan', code: 'TJ' }, { name: 'Tanzania', code: 'TZ' }, { name: 'Thailand', code: 'TH' },
    { name: 'Timor-Leste', code: 'TL' }, { name: 'Togo', code: 'TG' }, { name: 'Tokelau', code: 'TK' },
    { name: 'Tonga', code: 'TO' }, { name: 'Trinidad and Tobago', code: 'TT' }, { name: 'Tunisia', code: 'TN' },
    { name: 'Turkey', code: 'TR' }, { name: 'Turkmenistan', code: 'TM' }, { name: 'Turks and Caicos Islands', code: 'TC' },
    { name: 'Tuvalu', code: 'TV' }, { name: 'Uganda', code: 'UG' }, { name: 'Ukraine', code: 'UA' },
    { name: 'United Arab Emirates', code: 'AE' }, { name: 'United Kingdom', code: 'GB' }, { name: 'United States', code: 'US' },
    { name: 'Uruguay', code: 'UY' }, { name: 'Uzbekistan', code: 'UZ' }, { name: 'Vanuatu', code: 'VU' },
    { name: 'Vatican City', code: 'VA' }, { name: 'Venezuela', code: 'VE' }, { name: 'Vietnam', code: 'VN' },
    { name: 'Western Sahara', code: 'EH' }, { name: 'Yemen', code: 'YE' }, { name: 'Zambia', code: 'ZM' },
    { name: 'Zimbabwe', code: 'ZW' }
].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

// Country data - начинаем со статичного списка, затем обновим из API
let countries = staticCountries;

// Загрузка списка стран из API с кэшированием
async function loadCountriesFromAPI(useCache = true) {
    // Кэширование включено - сначала проверяем кэш для мгновенной загрузки
    const cacheKey = 'countries_cache';
    const cacheTimestampKey = 'countries_cache_timestamp';
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа
    
    // Сначала проверяем кэш для мгновенной загрузки
    if (useCache) {
        try {
            const cachedData = localStorage.getItem(cacheKey);
            const cacheTimestamp = localStorage.getItem(cacheTimestampKey);
            
            if (cachedData && cacheTimestamp) {
                const cacheAge = Date.now() - parseInt(cacheTimestamp);
                if (cacheAge < CACHE_TTL) {
                    console.log('✅ Загрузка списка стран из localStorage кэша (мгновенная загрузка)');
                    const result = JSON.parse(cachedData);
                    
                    if (result.success && result.data && Array.isArray(result.data)) {
                        // Преобразуем данные из кэша в нужный формат
                        countries = result.data.map(country => ({
                            name: country.name,
                            code: country.code
                        }));
                        
                        console.log(`✅ Загружено ${countries.length} стран из кэша`);
                        
                        // Обновляем UI с кэшированными данными
                        renderCountries(countries);
                        
                        // Возвращаем true, но продолжаем обновление из API в фоне
                        // Это позволяет показать кэшированные данные сразу
                        setTimeout(() => {
                            loadCountriesFromAPI(false).then((success) => {
                                if (success) {
                                    // Обновляем UI с актуальными данными из API
                                    renderCountries(countries);
                                }
                            });
                        }, 100);
                        return true;
                    }
                } else {
                    console.log('⚠️ Кэш истек, загружаем свежие данные');
                    localStorage.removeItem(cacheKey);
                    localStorage.removeItem(cacheTimestampKey);
                }
            }
        } catch (cacheError) {
            console.warn('⚠️ Ошибка при чтении кэша:', cacheError);
        }
    }
    
    try {
        console.log('🔄 Загрузка списка стран из API...');
        const response = await fetch('/api/esimgo/countries');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Сохраняем в кэш для следующего запуска
        try {
            localStorage.setItem(cacheKey, JSON.stringify(result));
            localStorage.setItem(cacheTimestampKey, Date.now().toString());
            console.log('✅ Список стран сохранен в localStorage кэш');
        } catch (cacheError) {
            console.warn('⚠️ Ошибка при сохранении в кэш:', cacheError);
        }
        
        if (result.success && result.data && Array.isArray(result.data)) {
            // Преобразуем данные из API в нужный формат
            countries = result.data.map(country => ({
                name: country.name,
                code: country.code
            }));
            
            console.log(`✅ Загружено ${countries.length} стран из API`);
            
            // Возвращаем успешный результат
            return true;
        } else {
            console.warn('⚠️ API вернул неожиданный формат данных, используем fallback');
        }
    } catch (error) {
        console.error('❌ Ошибка при загрузке стран из API:', error);
        console.log('📋 Используем fallback список стран');
        // Используем fallback список, который уже определен выше
    }
}

// Render countries list
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
            
            // Обработка ошибки загрузки
            let retryCount = 0;
            flagImg.onerror = function() {
                retryCount++;
                console.error(`❌ Failed to load flag (attempt ${retryCount}): ${flagPath}`);
                
                if (retryCount === 1) {
                    const pathWithoutVersion = flagPath.split('?')[0];
                    console.log(`🔄 Retrying without cache version: ${pathWithoutVersion}`);
                    this.src = pathWithoutVersion + '?t=' + Date.now();
                    return;
                }
                
                if (retryCount === 2) {
                    const code = country.code.toUpperCase();
                    if (code === 'CYP') {
                        console.log('🔄 Retrying with alternative filename for CYP');
                        this.src = `/flags/CYP.svg?${FLAG_VERSION}`;
                        return;
                    } else if (code === 'US-HI') {
                        console.log('🔄 Retrying with alternative filename for US-HI');
                        this.src = `/flags/US-HI.svg?${FLAG_VERSION}`;
                        return;
                    }
                }
                
                // Если повторная попытка не помогла, заменяем на эмодзи
                const emojiFlag = document.createElement('span');
                emojiFlag.className = 'country-flag';
                emojiFlag.textContent = '🏳️';
                this.parentNode.replaceChild(emojiFlag, this);
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

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query === '') {
            renderCountries(countries);
            return;
        }
        
        const filtered = countries.filter(country => 
            country.name.toLowerCase().includes(query) ||
            country.code.toLowerCase().includes(query)
        );
        
        renderCountries(filtered);
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
            
            const segment = btn.dataset.segment;
            
            // Navigate to different pages based on segment
            if (segment === 'region') {
                window.location.href = 'index.html?segment=region';
            } else if (segment === 'global') {
                window.location.href = 'global-plans.html';
            } else if (segment === 'local') {
                // Already on Local page
                return;
            }
        });
    });
}

// Initialize app
async function initializeApp() {
    // Сначала активируем кнопку Local
    const segmentButtons = document.querySelectorAll('.segment-btn');
    segmentButtons.forEach(btn => {
        if (btn.dataset.segment === 'local') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Настраиваем сегментированный контрол
    setupSegmentedControl();
    
    // Сначала показываем статичный список стран (мгновенно, без ожидания)
    renderCountries(countries);
    
    // Затем загружаем актуальные данные из API (с кэшированием)
    // Функция loadCountriesFromAPI обновит UI с актуальными данными
    await loadCountriesFromAPI();
    
    // Настраиваем поиск
    setupSearch();
    
    // Убеждаемся, что BackButton скрыта (показываем Close)
    hideBackButton();
}

// Запускаем приложение при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    // Сначала активируем кнопку Local (до initializeApp)
    const segmentButtons = document.querySelectorAll('.segment-btn');
    segmentButtons.forEach(btn => {
        if (btn.dataset.segment === 'local') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Сразу скрываем BackButton (чтобы показать Close) до инициализации
    hideBackButton();
    setTimeout(hideBackButton, 0);
    setTimeout(hideBackButton, 50);
    
    initializeApp();
    setupNavigation();
    
    // Принудительно скрываем BackButton после инициализации (чтобы показать Close)
    hideBackButton();
    setTimeout(hideBackButton, 100);
    setTimeout(hideBackButton, 200);
    setTimeout(hideBackButton, 300);
    
    // Проверяем и показываем нижнее меню
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) {
        console.log('🔵 Bottom nav found, ensuring visibility');
        bottomNav.style.display = 'flex';
        bottomNav.style.visibility = 'visible';
        bottomNav.style.opacity = '1';
        bottomNav.style.position = 'fixed';
        bottomNav.style.bottom = '0';
        bottomNav.style.zIndex = '10000';
    } else {
        console.error('❌ Bottom nav not found in DOM');
    }
});

// Setup bottom navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    console.log(`[Local Navigation] Found ${navItems.length} navigation items`);
    
    if (navItems.length === 0) {
        console.error('❌ [Local Navigation] No navigation items found!');
        return;
    }
    
    navItems.forEach((item, index) => {
        const label = item.querySelector('.nav-label')?.textContent;
        console.log(`[Local Navigation] Setting up item ${index}: ${label}`);
        
        // Удаляем все предыдущие обработчики для чистоты
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        const cleanItem = newItem;
        
        // Убеждаемся, что элемент кликабелен ДО добавления обработчиков
        cleanItem.style.pointerEvents = 'auto';
        cleanItem.style.cursor = 'pointer';
        cleanItem.style.touchAction = 'manipulation';
        cleanItem.style.webkitTapHighlightColor = 'transparent';
        cleanItem.style.userSelect = 'none';
        cleanItem.style.webkitUserSelect = 'none';
        cleanItem.style.position = 'relative';
        cleanItem.style.zIndex = '10001';
        
        // Обработчик для обычных кликов и touch событий
        const handleAction = (e) => {
            console.log(`[Local Navigation] Action on: ${label}`, e.type, e);
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // Haptic feedback
            if (tg && tg.HapticFeedback) {
                try {
                    tg.HapticFeedback.impactOccurred('light');
                } catch (e) {}
            }
            
            // Remove active class from all items
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            cleanItem.classList.add('active');
            
            // Navigate
            if (label === 'Account') {
                console.log('[Local Navigation] Navigating to account.html');
                window.location.href = 'account.html';
            } else if (label === 'Buy eSIM') {
                console.log('[Local Navigation] Navigating to index.html');
                window.location.href = 'index.html';
            } else if (label === 'Help') {
                console.log('[Local Navigation] Navigating to help.html');
                window.location.href = 'help.html';
            }
        };
        
        // Добавляем обработчики для разных типов событий с максимальным приоритетом
        cleanItem.addEventListener('click', handleAction, { capture: true, passive: false });
        cleanItem.addEventListener('touchend', handleAction, { capture: true, passive: false });
        cleanItem.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
        }, { capture: true, passive: false });
        
        // Дополнительный обработчик onclick (для максимальной совместимости)
        cleanItem.onclick = handleAction;
        
        // Также добавляем обработчик на mousedown для надежности
        cleanItem.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, { capture: true, passive: false });
        
        // Добавляем обработчик pointerdown (для современных браузеров)
        cleanItem.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, { capture: true, passive: false });
        
        console.log(`[Local Navigation] Handlers added for: ${label}`);
    });
    
    console.log('[Local Navigation] Navigation setup complete');
}

// Также обновляем BackButton при возврате на страницу
window.addEventListener('popstate', () => {
    // Обновляем активный сегмент
    const segmentButtons = document.querySelectorAll('.segment-btn');
    segmentButtons.forEach(btn => {
        if (btn.dataset.segment === 'local') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Скрываем BackButton
    hideBackButton();
});

window.addEventListener('pageshow', (event) => {
    console.log('📄 Local страница показана', { persisted: event.persisted });
    // Обновляем активный сегмент
    const segmentButtons = document.querySelectorAll('.segment-btn');
    segmentButtons.forEach(btn => {
        if (btn.dataset.segment === 'local') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Скрываем BackButton (на Local всегда показываем Close)
    hideBackButton();
    
    // Дополнительная проверка через небольшую задержку
    setTimeout(hideBackButton, 100);
    setTimeout(hideBackButton, 300);
});

// Периодическая проверка (на случай, если другие обработчики не сработали)
// Проверяем каждые 100мс для более быстрой реакции
setInterval(() => {
    // Обновляем активный сегмент
    const segmentButtons = document.querySelectorAll('.segment-btn');
    segmentButtons.forEach(btn => {
        if (btn.dataset.segment === 'local') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Скрываем BackButton (на Local всегда показываем Close)
    hideBackButton();
}, 100);

// Обработчик для случаев, когда страница становится видимой
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log('👁️ Local страница стала видимой, скрываем BackButton');
        hideBackButton();
        setTimeout(hideBackButton, 100);
    }
});

// Обработчик для focus (когда пользователь возвращается на вкладку)
window.addEventListener('focus', () => {
    console.log('🎯 Local страница получила фокус, скрываем BackButton');
    hideBackButton();
    setTimeout(hideBackButton, 100);
});

// Дополнительная проверка при полной загрузке страницы