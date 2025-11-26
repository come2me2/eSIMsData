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

// Optimized navigation helper
function navigateTo(url) {
    const navigate = window.optimizedNavigate || ((url) => { window.location.href = url; });
    navigate(url);
}

// Initialize app with optimized loading
document.addEventListener('DOMContentLoaded', () => {
    // Critical operations - execute immediately
    setupCancelButton();
    setupAccountItems();
    setupNavigation();
});

// Setup cancel button
function setupCancelButton() {
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (tg) {
                tg.close();
            } else {
                // Fallback for testing outside Telegram
                console.log('Close app');
            }
        });
    }
}

// Setup account items
function setupAccountItems() {
    // My eSIMs
    const myESimsBtn = document.getElementById('myESimsBtn');
    if (myESimsBtn) {
        myESimsBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            navigateTo('my-esims.html');
        });
    }
    
    // Current eSIM
    const currentESimBtn = document.getElementById('currentESimBtn');
    if (currentESimBtn) {
        currentESimBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            navigateTo('current-esim.html');
        });
    }
    
    // Privacy Policy
    const privacyPolicyBtn = document.getElementById('privacyPolicyBtn');
    if (privacyPolicyBtn) {
        privacyPolicyBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            navigateTo('privacy-policy.html');
        });
    }
    
    // Terms of Use
    const termsOfUseBtn = document.getElementById('termsOfUseBtn');
    if (termsOfUseBtn) {
        termsOfUseBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            navigateTo('terms-of-use.html');
        });
    }
    
    // Refund Policy
    const refundPolicyBtn = document.getElementById('refundPolicyBtn');
    if (refundPolicyBtn) {
        refundPolicyBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            navigateTo('refund-policy.html');
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
            navigateTo('account.html');
        });
    }
    
    // Buy eSIM button
    const buyESimNavBtn = document.getElementById('buyESimNavBtn');
    if (buyESimNavBtn) {
        buyESimNavBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            navigateTo('index.html');
        });
    }
    
    // Help button
    const helpNavBtn = document.getElementById('helpNavBtn');
    if (helpNavBtn) {
        helpNavBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            navigateTo('help.html');
        });
    }
}

