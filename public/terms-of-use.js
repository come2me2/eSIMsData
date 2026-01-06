// Telegram Web App initialization
let tg = window.Telegram.WebApp;

// Initialize Telegram Web App
if (tg) {
    tg.ready();
    tg.expand();
    
    // Set theme colors
    try {
        if (tg.setHeaderColor) tg.setHeaderColor('#FFFFFF');
        if (tg.setBackgroundColor) tg.setBackgroundColor('#F2F2F7');
    } catch (e) {
        console.warn('Theme colors not supported:', e);
    }
    
    // Показываем кнопку "назад" в Telegram (вместо Close)
    // Используем правильную инициализацию без мерцания
    const initBackButton = () => {
        if (tg && tg.BackButton) {
            try {
                // Удаляем предыдущий обработчик, если метод доступен
                if (typeof tg.BackButton.offClick === 'function') {
                    try {
                        tg.BackButton.offClick();
                    } catch (e) {}
                }
                
                // Показываем кнопку
                tg.BackButton.show();
                
                // Устанавливаем обработчик
                tg.BackButton.onClick(() => {
                    if (tg && tg.HapticFeedback) {
                        try {
                            tg.HapticFeedback.impactOccurred('light');
                        } catch (e) {}
                    }
                    // Возвращаемся на предыдущий экран (Account)
                    window.location.href = 'account.html';
                });
                console.log('✅ BackButton показана на Terms of Use');
            } catch (e) {
                console.error('❌ Ошибка при показе BackButton:', e);
            }
        }
    };
    
    // Используем requestAnimationFrame для плавной инициализации без мерцания
    requestAnimationFrame(() => {
        initBackButton();
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
});

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

