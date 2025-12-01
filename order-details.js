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

// Get order data from URL
const urlParams = new URLSearchParams(window.location.search);
const orderData = {
    id: urlParams.get('id') || '#99999',
    date: urlParams.get('date') || '2023-10-01',
    country: urlParams.get('country') || 'Germany',
    code: urlParams.get('code') || 'DE',
    plan: urlParams.get('plan') || '1GB',
    duration: urlParams.get('duration') || '7 Days',
    price: urlParams.get('price') || '$ 9.99',
    activationDate: urlParams.get('activationDate') || '2023-10-01',
    expiryDate: urlParams.get('expiryDate') || '2023-10-08',
    iccid: urlParams.get('iccid') || '8943108161005541531',
    matchingId: urlParams.get('matchingId') || 'JQ-1UAFOB-1B3U4SN',
    rspUrl: urlParams.get('rspUrl') || 'rsp.truphone.com'
};

// Function to get flag image URL from local flags folder
function getFlagPath(countryCode) {
    if (!countryCode) {
        return null;
    }
    // Use local SVG flags from flags folder
    // SVG is vector-based, so it's always crisp at any size and resolution
    // Format: flags/{code}.svg (SVG scales perfectly)
    const code = countryCode.toLowerCase();
    return `flags/${code}.svg`;
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupOrderDetails();
    setupBackButton();
    setupNavigation();
});

// Setup order details
function setupOrderDetails() {
    const orderNumberElement = document.getElementById('orderNumber');
    const orderPlanInfoElement = document.getElementById('orderPlanInfo');
    const iccidElement = document.getElementById('iccid');
    const matchingIdElement = document.getElementById('matchingId');
    const rspUrlElement = document.getElementById('rspUrl');
    const orderPriceElement = document.getElementById('orderPrice');
    
    // Update order number
    if (orderNumberElement) {
        orderNumberElement.textContent = `Order ${orderData.id}`;
    }
    
    // Update plan info
    if (orderPlanInfoElement) {
        orderPlanInfoElement.textContent = `${orderData.plan} ${orderData.duration} ${orderData.country} x1`;
    }
    
    // Update details
    if (iccidElement) iccidElement.textContent = orderData.iccid;
    if (matchingIdElement) matchingIdElement.textContent = orderData.matchingId;
    if (rspUrlElement) rspUrlElement.textContent = orderData.rspUrl;
    if (orderPriceElement) orderPriceElement.textContent = orderData.price;
}


// Setup back button
function setupBackButton() {
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            window.history.back();
        });
    }
}

// Setup bottom navigation
function setupNavigation() {
    // Account button
    const accountNavBtn = document.getElementById('accountNavBtn');
    if (accountNavBtn) {
        accountNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            const navigate = window.optimizedNavigate || ((url) => { window.location.href = url; });
            navigate('account.html');
        });
    }
    
    // Buy eSIM button
    const buyESimNavBtn = document.getElementById('buyESimNavBtn');
    if (buyESimNavBtn) {
        buyESimNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            const navigate = window.optimizedNavigate || ((url) => { window.location.href = url; });
            navigate('index.html');
        });
    }
    
    // Help button (in bottom nav)
    const helpNavBtn = document.getElementById('helpNavBtn');
    if (helpNavBtn) {
        helpNavBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            const navigate = window.optimizedNavigate || ((url) => { window.location.href = url; });
            navigate('help.html');
        });
    }
    
    // Help button (in content)
    const helpButton = document.getElementById('helpButton');
    if (helpButton) {
        helpButton.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            window.location.href = 'help.html';
        });
    }
}

