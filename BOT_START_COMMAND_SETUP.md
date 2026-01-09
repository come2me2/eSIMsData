# Настройка команды /start для Telegram бота

## 📋 Описание

При первом запуске бота, когда пользователь нажимает `/start`, бот отправляет приветственное сообщение с кнопкой "Get eSIM", которая открывает Telegram Mini App (TMA).

## ✅ Что уже сделано

1. ✅ Создан webhook handler: `/api/telegram/bot/webhook.js`
2. ✅ Endpoint зарегистрирован в `server.js`
3. ✅ Создан скрипт для настройки webhook: `scripts/setup-bot-webhook.js`

## 🚀 Настройка

### Шаг 1: Убедитесь, что переменные окружения установлены

В файле `.env` должны быть установлены:
```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret_here  # опционально, но рекомендуется
TELEGRAM_WEBAPP_URL=https://esimsdata.app  # опционально, по умолчанию используется esimsdata.app
```

### Шаг 2: Настройте webhook в Telegram

Запустите скрипт настройки webhook:

```bash
# Использование URL по умолчанию (из .env или esimsdata.app)
node scripts/setup-bot-webhook.js

# Или укажите URL явно
node scripts/setup-bot-webhook.js https://esimsdata.app
```

Скрипт автоматически:
- Настроит webhook на `/api/telegram/bot/webhook`
- Установит секретный токен (если указан)
- Покажет информацию о текущем webhook

### Шаг 3: Проверка работы

1. Откройте вашего бота в Telegram
2. Отправьте команду `/start`
3. Бот должен отправить сообщение:
   ```
   You're all set!

   Instant access to global eSIMs for travel and everyday use — no apps, just Telegram.
   ```
4. Под сообщением должна быть кнопка "Get eSIM"
5. При нажатии на кнопку должен открыться Telegram Mini App

## 🔧 Управление webhook

### Удалить webhook
```bash
node scripts/setup-bot-webhook.js delete
```

### Проверить информацию о webhook
Можно использовать Telegram Bot API напрямую:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

## 📝 Формат сообщения

При команде `/start` бот отправляет:
- **Текст**: "You're all set!\n\nInstant access to global eSIMs for travel and everyday use — no apps, just Telegram."
- **Кнопка**: "Get eSIM" (открывает Web App)

## 🔒 Безопасность

Webhook защищен секретным токеном (если установлен `TELEGRAM_WEBHOOK_SECRET`). Telegram будет отправлять этот токен в заголовке `x-telegram-bot-api-secret-token` при каждом запросе.

## 🐛 Отладка

Если команда `/start` не работает:

1. Проверьте логи сервера на наличие ошибок
2. Убедитесь, что webhook настроен правильно:
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```
3. Проверьте, что endpoint доступен:
   ```bash
   curl -X POST https://esimsdata.app/api/telegram/bot/webhook \
     -H "Content-Type: application/json" \
     -d '{"message":{"text":"/start","chat":{"id":123},"from":{"id":123}}}'
   ```
4. Убедитесь, что `TELEGRAM_BOT_TOKEN` установлен в `.env`
5. Проверьте, что URL Web App правильный (должен быть доступен по HTTPS)

## 📚 Дополнительная информация

- [Telegram Bot API - Webhooks](https://core.telegram.org/bots/api#setwebhook)
- [Telegram Bot API - Inline Keyboard](https://core.telegram.org/bots/api#inlinekeyboardmarkup)
- [Telegram Bot API - Web App Buttons](https://core.telegram.org/bots/api#inlinekeyboardbutton)


