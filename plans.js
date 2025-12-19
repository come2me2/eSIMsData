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
    if (tg.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            tg.HapticFeedback.impactOccurred('light');
            // Возвращаемся на главную (Local)
            window.location.href = 'index.html?segment=local';
        });
    }
}

// Get country data from URL
const urlParams = new URLSearchParams(window.location.search);
const countryData = {
    name: urlParams.get('country') || 'Afghanistan',
    code: urlParams.get('code') || 'AF'
};

// Plans data - загружаются из статических файлов (мгновенно) или API
let standardPlans = [];
let unlimitedPlans = [];

// Функция загрузки планов - приоритет: статические файлы -> API
async function loadPlansFromAPI(countryCode) {
    const startTime = performance.now();
    
    try {
        let data = null;
        
        // 1. Пробуем DataLoader (статические файлы + localStorage)
        if (window.DataLoader && typeof window.DataLoader.loadLocalPlans === 'function') {
            try {
                console.log('⚡ Loading plans via DataLoader...');
                data = await window.DataLoader.loadLocalPlans(countryCode);
            } catch (e) {
                console.warn('DataLoader failed:', e.message);
            }
        }
        
        // 2. Пробуем статический JSON напрямую
        if (!data) {
            try {
                const staticPath = `/data/plans-local-${countryCode.toLowerCase()}.json`;
                console.log('📁 Trying static file:', staticPath);
                const response = await fetch(staticPath);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        data = result.data;
                        console.log('✅ Loaded from static file');
                    }
                }
            } catch (e) {
                console.warn('Static file not available:', e.message);
            }
        }
        
        // 3. Fallback на API
        if (!data) {
            console.log('🔄 Falling back to API...');
            const params = new URLSearchParams();
            params.append('country', countryCode);
            params.append('category', 'local');
            
            const response = await fetch(`/api/esimgo/plans?${params.toString()}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                data = result.data;
            }
        }
        
        if (data) {
            standardPlans = data.standard || [];
            unlimitedPlans = data.unlimited || [];
            
            // Добавляем ID для совместимости
            standardPlans.forEach((plan, index) => {
                if (!plan.id) plan.id = `plan${index + 1}`;
            });
            
            unlimitedPlans.forEach((plan, index) => {
                if (!plan.id) plan.id = `unlimited${index + 1}`;
            });
            
            const loadTime = (performance.now() - startTime).toFixed(0);
            console.log(`✅ Plans loaded in ${loadTime}ms:`, {
                standard: standardPlans.length,
                unlimited: unlimitedPlans.length
            });
            
            return true;
        }
    } catch (error) {
        console.error('Error loading plans:', error);
    }
    
    // Fallback к захардкоженным планам
    console.warn('⚠️ Using fallback plans');
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
    
    return false;
}

let currentPlanType = 'standard';
let selectedPlanId = 'plan2'; // Default selected for standard

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    setupCountryInfo();
    setupSegmentedControl();
    
    // Загружаем реальные планы из API
    await loadPlansFromAPI(countryData.code);
    
    // Рендерим планы после загрузки
    renderPlans();
    updateInfoBox();
    setupNextButton();
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
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
    
    const navigate = window.optimizedNavigate || ((url) => { window.location.href = url; });
    
    if (section === 'Account') {
        navigate('account.html');
    } else if (section === 'Buy eSIM') {
        navigate('index.html');
    } else if (section === 'Help') {
        navigate('help.html');
    }
});

// Version for cache busting - increment when flags are updated
const FLAG_VERSION = 'v7'; // Updated: force refresh for missing flags (AX, BM, etc.)

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
        // Use CDN flag image
        const img = document.createElement('img');
        img.src = flagPath;
        img.alt = `${countryData.name} flag`;
        img.className = 'country-flag-img';
        img.onerror = function() {
            console.error('Failed to load flag:', flagPath);
            flagElement.textContent = '🏳️';
        };
        flagElement.innerHTML = '';
        flagElement.appendChild(img);
    } else {
        // Fallback to emoji
        if (flagElement) {
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
            type: 'country',
            name: countryData.name,
            code: countryData.code,
            plan: selectedPlanId,
            planType: currentPlanType
        });
        window.location.href = `checkout.html?${params.toString()}`;
    });
}

