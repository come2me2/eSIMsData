// Telegram Web App initialization
let tg = window.Telegram.WebApp;

// Немедленно скрываем BackButton при загрузке скрипта (до инициализации)
// Это важно, так как предыдущая страница могла показать BackButton
(function() {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.BackButton) {
        try {
            // Удаляем все обработчики перед скрытием
            if (typeof tg.BackButton.offClick === 'function') {
                try {
                    tg.BackButton.offClick();
                } catch (e) {}
            }
            tg.BackButton.hide();
            console.log('🔙 BackButton скрыта немедленно при загрузке скрипта (Help)');
        } catch (e) {
            console.warn('⚠️ Ошибка при немедленном скрытии BackButton:', e);
        }
    }
})();

// Функция для гарантированного скрытия BackButton (чтобы Telegram показывал Close)
function hideBackButtonOnRootHelp(pageName) {
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
    // Делаем это сразу и несколько раз для надежности
    hideBackButtonOnRootHelp('Help');
    setTimeout(() => hideBackButtonOnRootHelp('Help (timeout 0)'), 0);
    setTimeout(() => hideBackButtonOnRootHelp('Help (timeout 50)'), 50);
    setTimeout(() => hideBackButtonOnRootHelp('Help (timeout 100)'), 100);
    setTimeout(() => hideBackButtonOnRootHelp('Help (timeout 200)'), 200);
    
    // Дополнительно скрываем BackButton при показе/возврате на страницу
    window.addEventListener('pageshow', () => {
        hideBackButtonOnRootHelp('Help (pageshow)');
        setTimeout(() => hideBackButtonOnRootHelp('Help (pageshow timeout)'), 100);
    });
    
    // Обработка возврата на страницу через history.back()
    window.addEventListener('popstate', () => {
        console.log('🔙 popstate event на Help - скрываем BackButton');
        hideBackButtonOnRootHelp('Help (popstate)');
        // Множественные попытки скрытия для надежности
        setTimeout(() => hideBackButtonOnRootHelp('Help (popstate timeout 0)'), 0);
        setTimeout(() => hideBackButtonOnRootHelp('Help (popstate timeout 50)'), 50);
        setTimeout(() => hideBackButtonOnRootHelp('Help (popstate timeout 100)'), 100);
        setTimeout(() => hideBackButtonOnRootHelp('Help (popstate timeout 200)'), 200);
        setTimeout(() => hideBackButtonOnRootHelp('Help (popstate timeout 300)'), 300);
    });
    
    // Также перехватываем событие до того, как страница загрузится (если возможно)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            hideBackButtonOnRootHelp('Help (DOMContentLoaded)');
            setTimeout(() => hideBackButtonOnRootHelp('Help (DOMContentLoaded timeout)'), 100);
        });
    }
    
    window.addEventListener('focus', () => {
        hideBackButtonOnRootHelp('Help (focus)');
        setTimeout(() => hideBackButtonOnRootHelp('Help (focus timeout)'), 100);
    });
    
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            hideBackButtonOnRootHelp('Help (visibilitychange)');
            setTimeout(() => hideBackButtonOnRootHelp('Help (visibilitychange timeout)'), 100);
        }
    });
    
    // Периодическая проверка для гарантированного скрытия (каждые 200ms для более быстрой реакции)
    const hideInterval = setInterval(() => {
        tg = window.Telegram?.WebApp;
        if (tg && tg.BackButton) {
            // Всегда скрываем, даже если isVisible недоступен
            try {
                if (tg.BackButton.isVisible === true) {
                    hideBackButtonOnRootHelp('Help (interval check - visible)');
                } else {
                    // Скрываем в любом случае для надежности
                    hideBackButtonOnRootHelp('Help (interval check - always hide)');
                }
            } catch (e) {
                // Если isVisible недоступен, просто скрываем
                hideBackButtonOnRootHelp('Help (interval check - fallback)');
            }
        }
    }, 200);
    
    // Останавливаем интервал при уходе со страницы
    window.addEventListener('beforeunload', () => {
        clearInterval(hideInterval);
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
            // Открываем Telegram группу для связи
            if (tg && tg.openTelegramLink) {
                tg.openTelegramLink('https://t.me/SIAMOCEAN');
            } else {
                window.open('https://t.me/SIAMOCEAN', '_blank');
            }
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

