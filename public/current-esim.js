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

// Mock data for Current eSIM
const esimData = {
    plan: 'eSIM 1GB 7 Days Thailand',
    orderId: '20281',
    iccid: '8944422711105741667',
    startDate: '22/10/2025 07:59:52 +00:00',
    totalData: 1024, // MB
    usedData: 29.3, // MB
    remainingData: 970.7, // MB
    bundleDuration: 7, // days
    daysRemaining: 6, // days
    expiresDate: '29/10/2025 07:59:52 +00:00'
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupESimDetails();
    setupExtendButton();
    setupNavigation();
});

// Setup eSIM details
function setupESimDetails() {
    const esimCard = document.getElementById('esimCard');
    const extendBtn = document.getElementById('extendBtn');
    const emptyState = document.getElementById('emptyState');
    
    // Check if there's active eSIM data
    if (!esimData) {
        // Show empty state
        if (esimCard) esimCard.style.display = 'none';
        if (extendBtn) extendBtn.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }
    
    // Show eSIM card and hide empty state
    if (esimCard) esimCard.style.display = 'flex';
    if (extendBtn) extendBtn.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    
    // Plan
    const planElement = document.getElementById('esimPlan');
    if (planElement) {
        planElement.textContent = esimData.plan;
    }
    
    // Order and ICCID
    const orderInfoElement = document.getElementById('orderInfo');
    if (orderInfoElement) {
        orderInfoElement.textContent = `Order: ${esimData.orderId}. iccid: ${esimData.iccid}`;
    }
    
    // Start date
    const startDateElement = document.getElementById('startDate');
    if (startDateElement) {
        startDateElement.textContent = `Started: ${esimData.startDate}`;
    }
    
    // Usage text
    const usageTextElement = document.getElementById('usageText');
    if (usageTextElement) {
        usageTextElement.textContent = `${esimData.usedData}MB of ${esimData.totalData}MB used`;
    }
    
    // Remaining text
    const remainingTextElement = document.getElementById('remainingText');
    if (remainingTextElement) {
        remainingTextElement.textContent = `${esimData.remainingData}MB remaining`;
    }
    
    // Usage progress bar
    const usageProgressElement = document.getElementById('usageProgress');
    if (usageProgressElement) {
        const usagePercent = (esimData.usedData / esimData.totalData) * 100;
        usageProgressElement.style.width = `${usagePercent}%`;
    }
    
    // Expiration text
    const expirationTextElement = document.getElementById('expirationText');
    if (expirationTextElement) {
        expirationTextElement.textContent = `${esimData.bundleDuration} day bundle expires in ${esimData.daysRemaining} days`;
    }
    
    // Expiration progress bar
    const expirationProgressElement = document.getElementById('expirationProgress');
    if (expirationProgressElement) {
        const expirationPercent = ((esimData.bundleDuration - esimData.daysRemaining) / esimData.bundleDuration) * 100;
        expirationProgressElement.style.width = `${expirationPercent}%`;
    }
    
    // Expires date
    const expiresDateElement = document.getElementById('expiresDate');
    if (expiresDateElement) {
        expiresDateElement.textContent = `Expires on ${esimData.expiresDate}`;
    }
}

// Setup extend button
function setupExtendButton() {
    const extendBtn = document.getElementById('extendBtn');
    if (extendBtn) {
        extendBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('medium');
            }
            // TODO: Implement extend functionality
            console.log('Extend eSIM');
        });
    }
}

// Setup bottom navigation
function setupNavigation() {
    // Account button
    const accountNavBtn = Array.from(document.querySelectorAll('.nav-item')).find(item => 
        item.querySelector('.nav-label')?.textContent === 'Account'
    );
    if (accountNavBtn) {
        accountNavBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            window.location.href = 'account.html';
        });
    }
    
    // Buy eSIM button
    const buyESimNavBtn = document.getElementById('buyESimNavBtn');
    if (buyESimNavBtn) {
        buyESimNavBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            window.location.href = 'index.html';
        });
    }
    
    // Help button
    const helpNavBtn = document.getElementById('helpNavBtn');
    if (helpNavBtn) {
        helpNavBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            window.location.href = 'help.html';
        });
    }
}

// Function to update data from API (will be called when API is ready)
function updateESimDataFromAPI(data) {
    // Update esimData with API response
    if (data.usedData !== undefined) {
        esimData.usedData = data.usedData;
        esimData.remainingData = esimData.totalData - esimData.usedData;
        
        // Update UI
        const usageTextElement = document.getElementById('usageText');
        if (usageTextElement) {
            usageTextElement.textContent = `${esimData.usedData}MB of ${esimData.totalData}MB used`;
        }
        
        const remainingTextElement = document.getElementById('remainingText');
        if (remainingTextElement) {
            remainingTextElement.textContent = `${esimData.remainingData}MB remaining`;
        }
        
        const usageProgressElement = document.getElementById('usageProgress');
        if (usageProgressElement) {
            const usagePercent = (esimData.usedData / esimData.totalData) * 100;
            usageProgressElement.style.width = `${usagePercent}%`;
        }
    }
    
    if (data.daysRemaining !== undefined) {
        esimData.daysRemaining = data.daysRemaining;
        
        const expirationTextElement = document.getElementById('expirationText');
        if (expirationTextElement) {
            expirationTextElement.textContent = `${esimData.bundleDuration} day bundle expires in ${esimData.daysRemaining} days`;
        }
        
        const expirationProgressElement = document.getElementById('expirationProgress');
        if (expirationProgressElement) {
            const expirationPercent = ((esimData.bundleDuration - esimData.daysRemaining) / esimData.bundleDuration) * 100;
            expirationProgressElement.style.width = `${expirationPercent}%`;
        }
    }
}

