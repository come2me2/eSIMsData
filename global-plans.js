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

// Global plans - supported in 105 countries
const globalCountries = [
    'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia',
    'Austria', 'Bahrain', 'Bangladesh', 'Belgium', 'Bolivia',
    'Bosnia and Herzegovina', 'Brazil', 'Bulgaria', 'Cambodia', 'Canada',
    'Chile', 'China', 'Colombia', 'Costa Rica', 'Croatia',
    'Cyprus', 'Czech Republic', 'Denmark', 'Dominican Republic', 'Ecuador',
    'Egypt', 'Estonia', 'Finland', 'France', 'Georgia',
    'Germany', 'Greece', 'Guatemala', 'Honduras', 'Hong Kong',
    'Hungary', 'Iceland', 'India', 'Indonesia', 'Ireland',
    'Israel', 'Italy', 'Japan', 'Jordan', 'Kazakhstan',
    'Kenya', 'Kuwait', 'Latvia', 'Lithuania', 'Luxembourg',
    'Malaysia', 'Malta', 'Mexico', 'Morocco', 'Netherlands',
    'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Panama',
    'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar',
    'Romania', 'Russia', 'Saudi Arabia', 'Singapore', 'Slovakia',
    'Slovenia', 'South Africa', 'South Korea', 'Spain', 'Sweden',
    'Switzerland', 'Taiwan', 'Thailand', 'Turkey', 'Ukraine',
    'United Arab Emirates', 'China', 'United States', 'Uruguay', 'Venezuela',
    'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe', 'Angola',
    'Armenia', 'Azerbaijan', 'Belarus', 'Botswana', 'Brunei',
    'Chad', 'Congo', 'Cuba', 'Ethiopia', 'Fiji',
    'Ghana', 'Haiti', 'Iraq', 'Jamaica', 'Kyrgyzstan',
    'Laos', 'Lebanon', 'Madagascar', 'Maldives', 'Mongolia',
    'Myanmar', 'Nepal', 'Oman', 'Papua New Guinea', 'Paraguay',
    'Rwanda', 'Samoa', 'Senegal', 'Sri Lanka', 'Tanzania',
    'Tunisia', 'Uzbekistan', 'Vanuatu'
];

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
    setupMainSegmentedControl();
    setupSegmentedControl();
    renderPlans();
    updateInfoBox();
    setupBackButton();
    setupNextButton();
    setupCountriesList();
});

// Setup main segmented control (Region, Local, Global)
function setupMainSegmentedControl() {
    const segmentButtons = document.querySelectorAll('.segmented-control:not(.plans-segmented) .segment-btn');
    
    segmentButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const segment = btn.dataset.segment;
            
            if (segment === 'region') {
                window.location.href = 'index.html?segment=region';
            } else if (segment === 'local') {
                window.location.href = 'index.html?segment=local';
            } else if (segment === 'global') {
                // Already on global page
                return;
            }
        });
    });
}

// Setup segmented control for plan type
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

// Setup back button
function setupBackButton() {
    document.getElementById('backBtn').addEventListener('click', () => {
        if (tg) {
            tg.HapticFeedback.impactOccurred('light');
        }
        window.history.back();
    });
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
    const banner = document.getElementById('globalInfoBanner');
    const chevron = document.getElementById('globalInfoChevron');
    const container = document.getElementById('countriesListContainer');
    const countriesList = document.getElementById('countriesList');
    let isExpanded = false;
    
    if (!banner || !chevron || !container || !countriesList) return;
    
    // Render countries list
    globalCountries.forEach(countryName => {
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
            type: 'global',
            name: 'Global',
            plan: selectedPlanId,
            planType: currentPlanType
        });
        window.location.href = `checkout.html?${params.toString()}`;
    });
}

