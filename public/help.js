// Telegram Web App initialization
let tg = window.Telegram.WebApp;

// Функция для гарантированного скрытия BackButton (чтобы Telegram показывал Close)
function hideBackButtonOnRootHelp(pageName) {
    if (!tg || !tg.BackButton) return;
    try {
        tg.BackButton.hide();
        console.log(`🔙 BackButton скрыта на странице ${pageName} (Help — должна быть кнопка Close)`);
    } catch (e) {
        console.warn(`⚠️ Не удалось скрыть BackButton на Help (${pageName}):`, e);
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
        console.warn('Theme colors not supported on Help page:', e);
    }
    
    // На корневой странице Help всегда должна быть кнопка Close (BackButton скрыт)
    hideBackButtonOnRootHelp('Help');
    
    // Дополнительно скрываем BackButton при показе/возврате на страницу
    window.addEventListener('pageshow', () => hideBackButtonOnRootHelp('Help (pageshow)'));
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            hideBackButtonOnRootHelp('Help (visibilitychange)');
        }
    });
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
    const navItems = document.querySelectorAll('.nav-item');
    console.log(`[Help Navigation] Found ${navItems.length} navigation items`);
    
    navItems.forEach((item, index) => {
        const label = item.querySelector('.nav-label')?.textContent;
        console.log(`[Help Navigation] Setting up item ${index}: ${label}`);
        
        // Обработчик для обычных кликов и touch событий
        const handleAction = (e) => {
            console.log(`[Help Navigation] Action on: ${label}`, e);
            e.preventDefault();
            e.stopPropagation();
            
            // Haptic feedback
            if (tg && tg.HapticFeedback) {
                try {
                    tg.HapticFeedback.impactOccurred('light');
                } catch (e) {}
            }
            
            // Remove active class from all items
            navItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');
            
            // Navigate
            if (label === 'Account') {
                window.location.href = 'account.html';
            } else if (label === 'Buy eSIM') {
                window.location.href = 'index.html';
            } else if (label === 'Help') {
                // Already on Help page
                return;
            }
        };
        
        // Добавляем обработчики для разных типов событий
        item.addEventListener('click', handleAction, true); // capture phase
        item.addEventListener('touchend', handleAction, { passive: false, capture: true });
        item.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        }, { passive: false });
        
        // Дополнительный обработчик onclick
        item.onclick = handleAction;
        
        // Убеждаемся, что элемент кликабелен
        item.style.pointerEvents = 'auto';
        item.style.cursor = 'pointer';
    });
    
    console.log('[Help Navigation] Navigation setup complete');
}

