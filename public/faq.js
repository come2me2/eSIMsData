// Telegram Web App initialization
let tg = window.Telegram.WebApp;

// Initialize Telegram Web App
if (tg) {
    tg.ready();
    tg.expand();
    
    // Set theme colors
    tg.setHeaderColor('#FFFFFF');
    tg.setBackgroundColor('#F2F2F7');
    
    // Показываем кнопку "назад" в Telegram (вместо Close)
    // Важно: вызываем после ready() и с небольшой задержкой для надежности
    const showBackButton = () => {
        if (tg && tg.BackButton) {
            try {
                // Сначала скрываем, чтобы сбросить состояние
                tg.BackButton.hide();
                
                // Затем показываем
                setTimeout(() => {
                    if (tg && tg.BackButton) {
                        tg.BackButton.show();
                        tg.BackButton.onClick(() => {
                            if (tg && tg.HapticFeedback) {
                                try {
                                    tg.HapticFeedback.impactOccurred('light');
                                } catch (e) {}
                            }
                            // Возвращаемся на экран Help
                            window.location.href = 'help.html';
                        });
                        console.log('✅ BackButton показана на FAQ');
                    }
                }, 50);
            } catch (e) {
                console.error('❌ Ошибка при показе BackButton:', e);
            }
        }
    };
    
    // Пробуем несколько раз для надежности
    showBackButton();
    setTimeout(showBackButton, 100);
    setTimeout(showBackButton, 300);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
});

// Setup bottom navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    console.log(`[FAQ Navigation] Found ${navItems.length} navigation items`);
    
    navItems.forEach((item, index) => {
        const label = item.querySelector('.nav-label')?.textContent;
        console.log(`[FAQ Navigation] Setting up item ${index}: ${label}`);
        
        // Обработчик для обычных кликов и touch событий
        const handleAction = (e) => {
            console.log(`[FAQ Navigation] Action on: ${label}`, e);
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
                window.location.href = 'help.html';
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
    
    console.log('[FAQ Navigation] Navigation setup complete');
}

