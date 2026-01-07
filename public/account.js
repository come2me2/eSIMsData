// Telegram Web App initialization
let tg = window.Telegram.WebApp;

// Функция для гарантированного скрытия BackButton (чтобы Telegram показывал Close)
function hideBackButtonOnRootPage(pageName) {
    if (!tg || !tg.BackButton) return;
    try {
        tg.BackButton.hide();
        console.log(`🔙 BackButton скрыта на странице ${pageName} (должна быть кнопка Close)`);
    } catch (e) {
        console.warn(`⚠️ Не удалось скрыть BackButton на странице ${pageName}:`, e);
    }
}

// Initialize Telegram Web App
if (tg) {
    tg.ready();
    tg.expand();
    
    // Set theme colors
    try {
        if (tg.setHeaderColor) tg.setHeaderColor('#FFFFFF');
        if (tg.setBackgroundColor) tg.setBackgroundColor('#F2F2F7');
    } catch (e) {
        console.warn('Theme colors not supported on Account page:', e);
    }
    
    // Account - это главная вкладка, всегда скрываем BackButton (должна быть кнопка Close)
    hideBackButtonOnRootPage('Account');
    
    // Дополнительно скрываем BackButton при показе/возврате на страницу
    window.addEventListener('pageshow', () => hideBackButtonOnRootPage('Account (pageshow)'));
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            hideBackButtonOnRootPage('Account (visibilitychange)');
        }
    });
}

// Optimized navigation helper
function navigateTo(url) {
    const navigate = window.optimizedNavigate || ((url) => { window.location.href = url; });
    navigate(url);
}

// Initialize app with optimized loading
document.addEventListener('DOMContentLoaded', () => {
    // Telegram Auth - получение данных пользователя
    const auth = window.telegramAuth;
    if (auth && auth.isAuthenticated()) {
        const userData = auth.getUserData();
        console.log('Account page - User:', userData);
        
        // Можно использовать данные пользователя в интерфейсе
        // Например, показать имя пользователя
        window.currentUser = userData;
    }
    
    // Critical operations - execute immediately
    setupAccountItems();
    setupNavigation();
});

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

