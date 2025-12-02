/**
 * Примеры использования Telegram Auth
 * Этот файл содержит примеры кода для разных сценариев
 */

// ============================================
// ПРИМЕР 1: Базовая проверка авторизации
// ============================================

function checkAuthExample() {
    if (window.telegramAuth.isAuthenticated()) {
        console.log('Пользователь авторизован');
        console.log('User ID:', window.telegramAuth.getUserId());
        console.log('User Name:', window.telegramAuth.getUserName());
    } else {
        console.log('Пользователь не авторизован');
    }
}

// ============================================
// ПРИМЕР 2: Отображение данных пользователя в UI
// ============================================

function displayUserInfoExample() {
    const auth = window.telegramAuth;
    
    if (auth.isAuthenticated()) {
        // Отображение имени
        const nameElement = document.getElementById('userName');
        if (nameElement) {
            nameElement.textContent = auth.getUserName();
        }
        
        // Отображение фото
        const photoElement = document.getElementById('userPhoto');
        if (photoElement && auth.getUserPhoto()) {
            photoElement.src = auth.getUserPhoto();
            photoElement.style.display = 'block';
        }
        
        // Отображение ID (для отладки)
        const idElement = document.getElementById('userId');
        if (idElement) {
            idElement.textContent = `ID: ${auth.getUserId()}`;
        }
    }
}

// ============================================
// ПРИМЕР 3: Использование в account.html
// ============================================

function setupAccountPage() {
    const auth = window.telegramAuth;
    
    if (auth.isAuthenticated()) {
        // Можно показать персональные данные
        const userData = auth.getUserData();
        console.log('Account page - User data:', userData);
        
        // Например, загрузить заказы пользователя
        // loadUserOrders(userData.id);
    }
}

// ============================================
// ПРИМЕР 4: Сохранение заказа с Telegram ID
// ============================================

function saveOrderExample(orderData) {
    const auth = window.telegramAuth;
    
    if (!auth.isAuthenticated()) {
        alert('Пожалуйста, авторизуйтесь через Telegram');
        return;
    }
    
    const order = {
        ...orderData,
        telegram_user_id: auth.getUserId(),
        telegram_username: auth.getUsername(),
        user_name: auth.getUserName(),
        created_at: new Date().toISOString()
    };
    
    console.log('Order to save:', order);
    
    // Отправка на сервер (когда будет сервер)
    // fetch('/api/orders', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(order)
    // });
}

// ============================================
// ПРИМЕР 5: Загрузка данных пользователя при загрузке страницы
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const auth = window.telegramAuth;
    
    // Проверка авторизации
    if (auth.isAuthenticated()) {
        const userData = auth.getUserData();
        console.log('Page loaded - User:', userData);
        
        // Можно использовать userData.id для загрузки персональных данных
        // loadUserData(userData.id);
    } else {
        // Пользователь не авторизован - можно показать гостевой режим
        console.log('Guest mode');
    }
});

// ============================================
// ПРИМЕР 6: Использование в checkout.js
// ============================================

function checkoutWithUser() {
    const auth = window.telegramAuth;
    
    if (!auth.isAuthenticated()) {
        alert('Для оформления заказа необходимо авторизоваться');
        return;
    }
    
    const checkoutData = {
        user_id: auth.getUserId(),
        user_name: auth.getUserName(),
        user_username: auth.getUsername(),
        // ... остальные данные заказа
    };
    
    console.log('Checkout data:', checkoutData);
}

// ============================================
// ПРИМЕР 7: Валидация на сервере (когда будет сервер)
// ============================================

async function validateUserOnServer() {
    const auth = window.telegramAuth;
    
    try {
        const result = await auth.validateOnServer('/api/validate-telegram');
        console.log('Server validation result:', result);
        
        if (result.valid) {
            // Пользователь валидирован на сервере
            console.log('User validated on server');
        }
    } catch (error) {
        console.error('Validation failed:', error);
    }
}

// ============================================
// ПРИМЕР 8: Использование Haptic Feedback
// ============================================

function buttonClickExample() {
    const auth = window.telegramAuth;
    
    // Вибрация при нажатии кнопки
    auth.hapticFeedback('impact', 'light');
    
    // Ваша логика обработки клика
    console.log('Button clicked');
}

// ============================================
// ПРИМЕР 9: Главная кнопка Telegram
// ============================================

function setupMainButtonExample() {
    const auth = window.telegramAuth;
    
    auth.showMainButton({
        text: 'Оформить заказ',
        onClick: () => {
            auth.hapticFeedback('impact', 'medium');
            // Логика оформления заказа
            console.log('Order button clicked');
        }
    });
}

// ============================================
// ПРИМЕР 10: Back кнопка
// ============================================

function setupBackButtonExample() {
    const auth = window.telegramAuth;
    
    auth.showBackButton();
    auth.onBackButton(() => {
        auth.hapticFeedback('impact', 'light');
        window.history.back();
    });
}

// ============================================
// ПРИМЕР 11: Интеграция в существующий код (app.js)
// ============================================

// В вашем app.js можно добавить:

function integrateWithAppJS() {
    // После инициализации tg
    const auth = window.telegramAuth;
    
    if (auth.isAuthenticated()) {
        const userId = auth.getUserId();
        
        // Использовать userId для фильтрации данных
        // Например, показать только заказы этого пользователя
        console.log('Loading data for user:', userId);
    }
}

// ============================================
// ПРИМЕР 12: Проверка при переходе между страницами
// ============================================

function checkAuthOnPageLoad() {
    const auth = window.telegramAuth;
    
    // Проверка при загрузке любой страницы
    if (!auth.isAuthenticated()) {
        // Можно перенаправить на главную или показать сообщение
        console.warn('User not authenticated');
        
        // Опционально: редирект
        // window.location.href = 'index.html';
    }
}

// ============================================
// ПРИМЕР 13: Получение всех данных пользователя
// ============================================

function getAllUserDataExample() {
    const auth = window.telegramAuth;
    
    const allData = {
        // Основные данные
        user: auth.getUser(),
        userData: auth.getUserData(),
        
        // Дополнительные данные
        initDataUnsafe: auth.getInitDataUnsafe(),
        startParam: auth.getStartParam(),
        chatType: auth.getChatType(),
        
        // Для отправки на сервер
        initData: auth.getInitData()
    };
    
    console.log('All user data:', allData);
    return allData;
}

// ============================================
// ПРИМЕР 14: Использование в my-esims.js
// ============================================

function loadUserESims() {
    const auth = window.telegramAuth;
    
    if (!auth.isAuthenticated()) {
        // Показать пустое состояние
        return;
    }
    
    const userId = auth.getUserId();
    
    // Загрузка eSIM заказов пользователя
    // fetch(`/api/user/${userId}/esims`)
    //     .then(response => response.json())
    //     .then(data => {
    //         renderESimsList(data);
    //     });
    
    console.log('Loading eSIMs for user:', userId);
}

// ============================================
// ПРИМЕР 15: Логирование действий пользователя
// ============================================

function logUserAction(action, data = {}) {
    const auth = window.telegramAuth;
    
    const logData = {
        action,
        user_id: auth.getUserId(),
        user_name: auth.getUserName(),
        timestamp: new Date().toISOString(),
        ...data
    };
    
    console.log('User action:', logData);
    
    // Отправка на сервер для аналитики
    // fetch('/api/analytics', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(logData)
    // });
}





