// Пример работы с Telegram WebApp SDK БЕЗ сервера
// Этот код работает полностью на клиентской стороне

// Telegram Web App initialization
let tg = window.Telegram.WebApp;

if (tg) {
    tg.ready();
    tg.expand();
    
    // Получение данных пользователя (БЕЗ сервера)
    const user = tg.initDataUnsafe?.user;
    
    if (user) {
        console.log('User ID:', user.id);
        console.log('First Name:', user.first_name);
        console.log('Last Name:', user.last_name);
        console.log('Username:', user.username);
        console.log('Language Code:', user.language_code);
        console.log('Photo URL:', user.photo_url);
        
        // Можно использовать эти данные в приложении
        displayUserInfo(user);
    }
    
    // Другие данные, доступные без сервера
    console.log('Chat Type:', tg.initDataUnsafe?.chat_type);
    console.log('Chat Instance:', tg.initDataUnsafe?.chat_instance);
    console.log('Start Param:', tg.initDataUnsafe?.start_param);
    console.log('Auth Date:', tg.initDataUnsafe?.auth_date);
    
    // Полный initData (строка для отправки на сервер для валидации)
    const initData = tg.initData;
    console.log('Init Data (для валидации на сервере):', initData);
}

// Функция для отображения информации о пользователе
function displayUserInfo(user) {
    // Пример: отображение имени пользователя в интерфейсе
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = user.first_name || 'User';
    }
    
    // Пример: отображение аватара
    const userAvatarElement = document.getElementById('userAvatar');
    if (userAvatarElement && user.photo_url) {
        userAvatarElement.src = user.photo_url;
    }
}

// Получение всех доступных данных
function getAllUserData() {
    if (!tg) return null;
    
    return {
        // Данные пользователя
        user: tg.initDataUnsafe?.user,
        
        // Данные чата
        chat: tg.initDataUnsafe?.chat,
        chatType: tg.initDataUnsafe?.chat_type,
        chatInstance: tg.initDataUnsafe?.chat_instance,
        
        // Параметры запуска
        startParam: tg.initDataUnsafe?.start_param,
        queryId: tg.initDataUnsafe?.query_id,
        
        // Метаданные
        authDate: tg.initDataUnsafe?.auth_date,
        hash: tg.initDataUnsafe?.hash,
        
        // Полная строка initData (для валидации на сервере)
        initData: tg.initData,
        
        // Версия приложения
        version: tg.version,
        platform: tg.platform
    };
}

// Пример использования в вашем приложении
document.addEventListener('DOMContentLoaded', () => {
    const userData = getAllUserData();
    
    if (userData?.user) {
        // Пользователь авторизован через Telegram
        console.log('Пользователь авторизован:', userData.user);
        
        // Можно сохранить в localStorage для использования в приложении
        localStorage.setItem('telegram_user', JSON.stringify(userData.user));
    } else {
        // Пользователь не авторизован или открыто не из Telegram
        console.log('Приложение открыто не из Telegram или пользователь не авторизован');
    }
});
























