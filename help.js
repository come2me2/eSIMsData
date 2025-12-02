// Telegram Web App initialization
let tg = window.Telegram.WebApp;

// Initialize Telegram Web App
if (tg) {
    tg.ready();
    tg.expand();
    
    // Set theme colors
    tg.setHeaderColor('#FFFFFF');
    tg.setBackgroundColor('#F2F2F7');
    
    // Help - это главная вкладка, скрываем кнопку "назад"
    if (tg.BackButton) {
        tg.BackButton.hide();
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupHelpItems();
    setupNavigation();
});

// Setup help items
function setupHelpItems() {
    const faqBtn = document.getElementById('faqBtn');
    if (faqBtn) {
        faqBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            window.location.href = 'faq.html';
        });
    }
    
    const contactBtn = document.getElementById('contactBtn');
    if (contactBtn) {
        contactBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            // TODO: Navigate to Contact page
            console.log('Navigate to Contact');
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
    const buyESimNavBtn = Array.from(document.querySelectorAll('.nav-item')).find(item => 
        item.querySelector('.nav-label')?.textContent === 'Buy eSIM'
    );
    if (buyESimNavBtn) {
        buyESimNavBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            window.location.href = 'index.html';
        });
    }
    
    // Help button - already on Help page
    const helpNavBtn = Array.from(document.querySelectorAll('.nav-item')).find(item => 
        item.querySelector('.nav-label')?.textContent === 'Help'
    );
    if (helpNavBtn) {
        helpNavBtn.addEventListener('click', () => {
            if (tg) {
                tg.HapticFeedback.impactOccurred('light');
            }
            // Already on Help page
            return;
        });
    }
}

