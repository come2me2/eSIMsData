# Пошаговая инструкция по интеграции Telegram SDK и авторизации

## 📋 Что уже есть в проекте

✅ Telegram SDK подключен через CDN: `https://telegram.org/js/telegram-web-app.js`  
✅ Базовая инициализация в файлах `app.js`, `account.js` и других

## 🚀 Шаг 1: Добавление telegram-auth.js в HTML файлы

Добавьте скрипт `telegram-auth.js` во все HTML файлы **ПЕРЕД** закрывающим тегом `</body>`:

### index.html
```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script src="telegram-auth.js"></script>
<script src="app.js"></script>
</body>
```

### account.html
```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script src="telegram-auth.js"></script>
<script src="account.js"></script>
</body>
```

### my-esims.html
```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script src="telegram-auth.js"></script>
<script src="my-esims.js"></script>
</body>
```

### checkout.html
```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script src="telegram-auth.js"></script>
<script src="checkout.js"></script>
</body>
```

**Добавьте во все остальные HTML файлы аналогично!**

## 🔧 Шаг 2: Обновление существующих JS файлов

### 2.1. Обновление app.js

В начале файла `app.js`, после инициализации `tg`, добавьте:

```javascript
// Telegram Web App initialization
let tg = window.Telegram.WebApp;

// Initialize Telegram Web App
if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#FFFFFF');
    tg.setBackgroundColor('#F2F2F7');
}

// Использование Telegram Auth
document.addEventListener('DOMContentLoaded', () => {
    const auth = window.telegramAuth;
    
    if (auth.isAuthenticated()) {
        const userId = auth.getUserId();
        const userName = auth.getUserName();
        
        console.log('User authenticated:', userId, userName);
        
        // Можно использовать userId для загрузки персональных данных
        // Например, фильтровать страны по региону пользователя
    }
    
    // Остальной код инициализации...
    setupSegmentedControl();
    setupNavigation();
    // ...
});
```

### 2.2. Обновление account.js

В `account.js` добавьте отображение данных пользователя:

```javascript
// В функции setupAccountItems или в DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    const auth = window.telegramAuth;
    
    if (auth.isAuthenticated()) {
        // Можно показать имя пользователя в интерфейсе
        const userData = auth.getUserData();
        console.log('Account - User:', userData);
    }
    
    setupCancelButton();
    setupAccountItems();
    setupNavigation();
});
```

### 2.3. Обновление my-esims.js

В `my-esims.js` используйте Telegram ID для загрузки заказов:

```javascript
// В функции renderESimsList или setupNavigation
function loadUserESims() {
    const auth = window.telegramAuth;
    
    if (!auth.isAuthenticated()) {
        // Показать пустое состояние
        esimsList.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    const userId = auth.getUserId();
    console.log('Loading eSIMs for user:', userId);
    
    // Когда будет сервер, загружать заказы пользователя:
    // fetch(`/api/user/${userId}/esims`)
    //     .then(response => response.json())
    //     .then(data => renderESimsList(data));
    
    // Пока используем моковые данные
    renderESimsList();
}
```

### 2.4. Обновление checkout.js

В `checkout.js` добавьте Telegram ID в данные заказа:

```javascript
// В функции setupOrderDetails или при оформлении заказа
function createOrder() {
    const auth = window.telegramAuth;
    
    if (!auth.isAuthenticated()) {
        alert('Пожалуйста, авторизуйтесь через Telegram');
        return;
    }
    
    const orderData = {
        ...orderData, // существующие данные заказа
        telegram_user_id: auth.getUserId(),
        telegram_username: auth.getUsername(),
        user_name: auth.getUserName(),
        created_at: new Date().toISOString()
    };
    
    console.log('Creating order:', orderData);
    
    // Когда будет сервер:
    // fetch('/api/orders', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(orderData)
    // });
}
```

## 🧪 Шаг 3: Тестирование

### 3.1. Локальное тестирование

1. Запустите локальный сервер:
```bash
cd /Users/sergeykalinin/Desktop/eSim
python -m http.server 8000
```

2. Откройте в браузере: `http://localhost:8000`

3. В консоли браузера (F12) проверьте:
```javascript
// Проверка работы
console.log(window.telegramAuth);
console.log(window.telegramAuth.isAuthenticated());
console.log(window.telegramAuth.getUserData());
```

### 3.2. Тестирование в Telegram

1. **Создайте бота через @BotFather:**
   - Откройте [@BotFather](https://t.me/BotFather)
   - Отправьте `/newbot`
   - Следуйте инструкциям
   - Сохраните токен бота

2. **Настройте Web App:**
   - Отправьте `/newapp` боту
   - Выберите вашего бота
   - Укажите название: `eSimsData`
   - Загрузите иконку (опционально)
   - Для локального тестирования используйте ngrok:
     ```bash
     ngrok http 8000
     ```
   - Укажите URL: `https://your-ngrok-url.ngrok.io`

3. **Откройте бота в Telegram:**
   - Найдите вашего бота
   - Нажмите на кнопку меню или команду `/start`
   - Откройте Web App
   - Проверьте консоль в браузере (F12)

## 📱 Шаг 4: Использование в интерфейсе

### 4.1. Отображение имени пользователя

Добавьте в HTML (например, в `account.html`):

```html
<div id="userInfo" style="display: none;">
    <p>Привет, <span id="userName"></span>!</p>
</div>
```

В JavaScript:

```javascript
const auth = window.telegramAuth;
if (auth.isAuthenticated()) {
    document.getElementById('userName').textContent = auth.getUserName();
    document.getElementById('userInfo').style.display = 'block';
}
```

### 4.2. Отображение фото пользователя

```html
<img id="userPhoto" src="" alt="User Photo" style="display: none; width: 40px; height: 40px; border-radius: 50%;">
```

```javascript
const auth = window.telegramAuth;
if (auth.getUserPhoto()) {
    document.getElementById('userPhoto').src = auth.getUserPhoto();
    document.getElementById('userPhoto').style.display = 'block';
}
```

## 🔐 Шаг 5: Безопасность (когда будет сервер)

### 5.1. Валидация initData на сервере

Когда у вас будет сервер, обязательно валидируйте `initData`:

```javascript
// На клиенте (когда будет сервер)
const auth = window.telegramAuth;
const result = await auth.validateOnServer('/api/validate-telegram');
```

### 5.2. Пример валидации на сервере (Node.js)

```javascript
// server.js
const crypto = require('crypto');

function validateInitData(initData, botToken) {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    const dataCheckString = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    
    const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();
    
    const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');
    
    return calculatedHash === hash;
}
```

## 📊 Шаг 6: Отладка

### Проверка работы авторизации

Откройте консоль браузера (F12) и выполните:

```javascript
// Проверка доступности
console.log('Telegram Auth:', window.telegramAuth);

// Проверка авторизации
console.log('Is Authenticated:', window.telegramAuth.isAuthenticated());

// Данные пользователя
console.log('User Data:', window.telegramAuth.getUserData());

// Все данные
console.log('All Data:', {
    user: window.telegramAuth.getUser(),
    initData: window.telegramAuth.getInitData(),
    initDataUnsafe: window.telegramAuth.getInitDataUnsafe()
});
```

## ✅ Чеклист интеграции

- [ ] Добавлен `telegram-auth.js` во все HTML файлы
- [ ] Обновлен `app.js` для использования авторизации
- [ ] Обновлен `account.js` для отображения данных пользователя
- [ ] Обновлен `my-esims.js` для загрузки заказов пользователя
- [ ] Обновлен `checkout.js` для сохранения Telegram ID в заказе
- [ ] Протестировано локально
- [ ] Создан бот через @BotFather
- [ ] Настроен Web App URL
- [ ] Протестировано в Telegram

## 🆘 Решение проблем

### Проблема: `window.telegramAuth is undefined`

**Решение:** Убедитесь, что `telegram-auth.js` подключен ПЕРЕД другими скриптами.

### Проблема: `isAuthenticated()` возвращает `false`

**Решение:** 
- Убедитесь, что открываете приложение через Telegram
- Проверьте, что Web App правильно настроен в @BotFather
- Проверьте консоль на ошибки

### Проблема: Данные пользователя не отображаются

**Решение:**
- Проверьте консоль браузера
- Убедитесь, что вызываете функции после `DOMContentLoaded`
- Проверьте, что элементы с нужными ID существуют в HTML

## 📚 Дополнительные ресурсы

- [Telegram Web Apps Documentation](https://core.telegram.org/bots/webapps)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- Примеры использования: см. `telegram-auth-examples.js`

## 🎯 Следующие шаги

1. ✅ Интегрируйте авторизацию в проект
2. ⏳ Настройте сервер на Contabo
3. ⏳ Добавьте валидацию initData на сервере
4. ⏳ Создайте API для работы с заказами
5. ⏳ Интегрируйте платежи




