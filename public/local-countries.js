// Telegram Web App initialization
let tg = window.Telegram.WebApp;

// Initialize Telegram Web App
if (tg) {
    tg.ready();
    tg.expand();
    
    // Set theme colors
    tg.setHeaderColor('#FFFFFF');
    tg.setBackgroundColor('#F2F2F7');
    
    // На странице Local всегда скрываем BackButton (показываем Close)
    if (tg.BackButton) {
        tg.BackButton.hide();
        console.log('🔙 BackButton скрыта (Local страница - показываем Close)');
    }
}

// Flag version for cache busting
const FLAG_VERSION = 'v7';

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

// Country data - будет загружено из API
let countries = [
    { name: 'Afghanistan', code: 'AF' },
    { name: 'Thailand', code: 'TH' },
    { name: 'China', code: 'CN' },
    { name: 'Spain', code: 'ES' },
    { name: 'Indonesia', code: 'ID' },
]; // Fallback список

// Загрузка списка стран из API
async function loadCountriesFromAPI() {
    try {
        console.log('🔄 Загрузка списка стран из API...');
        const response = await fetch('/api/esimgo/countries');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
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
    // Настраиваем сегментированный контрол
    setupSegmentedControl();
    
    // Загружаем страны из API
    await loadCountriesFromAPI();
    
    // Рендерим список стран
    renderCountries(countries);
    
    // Настраиваем поиск
    setupSearch();
    
    // Убеждаемся, что BackButton скрыта
    if (tg && tg.BackButton) {
        tg.BackButton.hide();
    }
}

// Запускаем приложение при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Также обновляем BackButton при возврате на страницу
window.addEventListener('popstate', () => {
    if (tg && tg.BackButton) {
        tg.BackButton.hide();
    }
});

window.addEventListener('pageshow', () => {
    if (tg && tg.BackButton) {
        tg.BackButton.hide();
    }
});

// Периодическая проверка (на случай, если другие обработчики не сработали)
setInterval(() => {
    if (tg && tg.BackButton) {
        tg.BackButton.hide();
    }
}, 300);

