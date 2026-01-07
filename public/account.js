// Telegram Web App initialization
let tg = window.Telegram.WebApp;

// Немедленно скрываем BackButton при загрузке скрипта (до инициализации)
// Это важно, так как предыдущая страница могла показать BackButton
if (tg && tg.BackButton) {
    tg.BackButton.hide();
    console.log('🔙 BackButton скрыта немедленно при загрузке скрипта (Account)');
}

// Функция для гарантированного скрытия BackButton (чтобы Telegram показывал Close)
function hideBackButtonOnRootPage(pageName) {
    // Обновляем ссылку на tg, так как она может измениться
    tg = window.Telegram?.WebApp;
    
    if (!tg || !tg.BackButton) return;
    try {
        // Удаляем все обработчики onClick перед скрытием
        if (typeof tg.BackButton.offClick === 'function') {
            try {
                tg.BackButton.offClick();
            } catch (e) {}
        }
        
        // Скрываем BackButton
        tg.BackButton.hide();
        console.log(`🔙 BackButton скрыта на странице ${pageName} (Account — должна быть кнопка Close)`);
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
    // Делаем это сразу и несколько раз для надежности
    hideBackButtonOnRootPage('Account');
    setTimeout(() => hideBackButtonOnRootPage('Account (timeout 0)'), 0);
    setTimeout(() => hideBackButtonOnRootPage('Account (timeout 50)'), 50);
    setTimeout(() => hideBackButtonOnRootPage('Account (timeout 100)'), 100);
    setTimeout(() => hideBackButtonOnRootPage('Account (timeout 200)'), 200);
    
    // Дополнительно скрываем BackButton при показе/возврате на страницу
    window.addEventListener('pageshow', () => {
        hideBackButtonOnRootPage('Account (pageshow)');
        setTimeout(() => hideBackButtonOnRootPage('Account (pageshow timeout)'), 100);
    });
    
    // Обработка возврата на страницу через history.back()
    window.addEventListener('popstate', () => {
        console.log('🔙 popstate event на Account - скрываем BackButton');
        hideBackButtonOnRootPage('Account (popstate)');
        // Множественные попытки скрытия для надежности
        setTimeout(() => hideBackButtonOnRootPage('Account (popstate timeout 0)'), 0);
        setTimeout(() => hideBackButtonOnRootPage('Account (popstate timeout 50)'), 50);
        setTimeout(() => hideBackButtonOnRootPage('Account (popstate timeout 100)'), 100);
        setTimeout(() => hideBackButtonOnRootPage('Account (popstate timeout 200)'), 200);
        setTimeout(() => hideBackButtonOnRootPage('Account (popstate timeout 300)'), 300);
    });
    
    // Также перехватываем событие до того, как страница загрузится (если возможно)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            hideBackButtonOnRootPage('Account (DOMContentLoaded)');
            setTimeout(() => hideBackButtonOnRootPage('Account (DOMContentLoaded timeout)'), 100);
        });
    }
    
    window.addEventListener('focus', () => {
        hideBackButtonOnRootPage('Account (focus)');
        setTimeout(() => hideBackButtonOnRootPage('Account (focus timeout)'), 100);
    });
    
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            hideBackButtonOnRootPage('Account (visibilitychange)');
            setTimeout(() => hideBackButtonOnRootPage('Account (visibilitychange timeout)'), 100);
        }
    });
    
    // Периодическая проверка для гарантированного скрытия (каждые 200ms для более быстрой реакции)
    const hideInterval = setInterval(() => {
        tg = window.Telegram?.WebApp;
        if (tg && tg.BackButton) {
            // Всегда скрываем, даже если isVisible недоступен
            try {
                if (tg.BackButton.isVisible === true) {
                    hideBackButtonOnRootPage('Account (interval check - visible)');
                } else {
                    // Скрываем в любом случае для надежности
                    hideBackButtonOnRootPage('Account (interval check - always hide)');
                }
            } catch (e) {
                // Если isVisible недоступен, просто скрываем
                hideBackButtonOnRootPage('Account (interval check - fallback)');
            }
        }
    }, 200);
    
    // Останавливаем интервал при уходе со страницы
    window.addEventListener('beforeunload', () => {
        clearInterval(hideInterval);
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

