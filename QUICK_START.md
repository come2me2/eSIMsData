# Быстрый старт: Telegram SDK и авторизация

## 🚀 За 5 минут

### 1. Файлы уже созданы:
- ✅ `telegram-auth.js` - основная утилита
- ✅ `telegram-auth-examples.js` - примеры использования
- ✅ `INTEGRATION_GUIDE.md` - подробная инструкция

### 2. Добавьте скрипт в HTML файлы

В каждом HTML файле добавьте перед `app.js` (или другим основным скриптом):

```html
<script src="telegram-auth.js"></script>
```

**Пример для index.html:**
```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<script src="telegram-auth.js"></script>
<script src="app.js"></script>
```

### 3. Используйте в коде

```javascript
// Проверка авторизации
if (window.telegramAuth.isAuthenticated()) {
    const userId = window.telegramAuth.getUserId();
    const userName = window.telegramAuth.getUserName();
    console.log('User:', userId, userName);
}
```

### 4. Тестирование

**Локально:**
```bash
python -m http.server 8000
# Откройте http://localhost:8000
```

**В Telegram:**
1. Создайте бота через @BotFather
2. Настройте Web App: `/newapp`
3. Укажите URL (для теста используйте ngrok)
4. Откройте бота в Telegram

## 📖 Полная инструкция

См. `INTEGRATION_GUIDE.md` для подробной инструкции.

## 💡 Примеры

См. `telegram-auth-examples.js` для примеров использования.

## ✅ Готово!

Теперь вы можете использовать:
- `window.telegramAuth.getUserId()` - получить Telegram ID
- `window.telegramAuth.getUserName()` - получить имя
- `window.telegramAuth.isAuthenticated()` - проверить авторизацию
- И многое другое (см. `telegram-auth.js`)




























