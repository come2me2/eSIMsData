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
            window.history.back();
        });
    }
}

// Get country data from URL
const urlParams = new URLSearchParams(window.location.search);
const countryData = {
    name: urlParams.get('country') || 'Afghanistan',
    code: urlParams.get('code') || 'AF'
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
                country: countryCode,
                sampleStandard: standardPlans[0] || null,
                sampleUnlimited: unlimitedPlans[0] || null
            });
            
            // Логируем первые планы для отладки
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
    setupCountryInfo();
    setupSegmentedControl();
    
    // Загружаем реальные планы из API
    console.log('🔵 Loading plans for country:', countryData.code);
    await loadPlansFromAPI(countryData.code);
    
    // Рендерим планы после загрузки
    renderPlans();
    updateInfoBox();
    setupNextButton();
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
        const checkoutUrl = `checkout.html?type=country&code=${countryData.code}&name=${encodeURIComponent(countryData.name)}&plan=${selectedPlanId}&planType=${currentPlanType}`;
        window.location.href = checkoutUrl;
    });
}
