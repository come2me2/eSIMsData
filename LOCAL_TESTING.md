# 🧪 Локальное тестирование

## 🌐 Запущенные серверы

### 1. HTTP сервер (статический)
**URL:** http://localhost:8000

**Для чего:**
- Тестирование статических HTML/CSS/JS файлов
- Просмотр интерфейса

**Ограничения:**
- ❌ API endpoints не работают (требуют Vercel)

### 2. Vercel dev (API endpoints)
**URL:** http://localhost:3000

**Для чего:**
- Полная функциональность API endpoints
- Тестирование интеграции с eSIM Go API

**Запуск:**
```bash
npx vercel dev --listen 3000
```

**Проверка статуса:**
```bash
tail -f /tmp/vercel-dev.log
```

## 📋 Тестовые страницы

### 1. Главная страница
http://localhost:8000/index.html

### 2. Тестовая страница eSIM Go API
http://localhost:8000/test-esimgo.html

**Что тестирует:**
- Подключение к API
- Получение каталога
- Получение списка стран
- Получение тарифов

### 3. Checkout (тестирование покупок)
http://localhost:8000/checkout.html?type=country&code=TH&name=Thailand&plan=plan1&planType=standard

**Параметры:**
- `type` - тип (country, region, global)
- `code` - код страны (ISO, например: TH)
- `name` - название страны
- `plan` - ID плана (plan1, plan2, etc.)
- `planType` - тип плана (standard, unlimited)

## 🔧 API Endpoints для тестирования

Если Vercel dev запущен на порту 3000:

### Поиск bundle
```
GET http://localhost:3000/api/esimgo/find-bundle?country=TH&dataAmount=1000&duration=7&unlimited=false
```

### Создание заказа
```
POST http://localhost:3000/api/esimgo/order
Content-Type: application/json

{
  "bundle_name": "esim_1GB_7D_TH_V2",
  "telegram_user_id": 123456789,
  "country_code": "TH",
  "country_name": "Thailand",
  "plan_id": "plan1",
  "plan_type": "standard"
}
```

### Получение каталога
```
GET http://localhost:3000/api/esimgo/catalogue-processed
```

### Получение QR кода
```
GET http://localhost:3000/api/esimgo/assignments?reference=ORDER_REFERENCE
```

## 🛑 Остановка серверов

### HTTP сервер
```bash
kill $(cat /tmp/http-server.pid)
```

### Vercel dev
```bash
kill $(cat /tmp/vercel-dev.pid)
```

Или найдите процесс и остановите:
```bash
ps aux | grep "vercel dev"
kill <PID>
```

## ⚠️ Важные моменты

1. **Переменные окружения:** Для работы API нужен `ESIMGO_API_KEY`
   - В Vercel dev он берется из `.env.local` или Vercel проекта
   - Создайте `.env.local` с `ESIMGO_API_KEY=your_key`

2. **CORS:** API endpoints настроены для работы с любым origin

3. **Telegram авторизация:** Для полного тестирования нужен Telegram Web App
   - Можно тестировать API endpoints напрямую через curl/Postman
   - Для UI тестирования нужен Telegram бот

## 🧪 Примеры тестирования

### Тест поиска bundle
```bash
curl "http://localhost:3000/api/esimgo/find-bundle?country=TH&dataAmount=1000&duration=7&unlimited=false"
```

### Тест получения каталога
```bash
curl "http://localhost:3000/api/esimgo/catalogue-processed"
```

### Тест создания заказа (требует API ключ)
```bash
curl -X POST "http://localhost:3000/api/esimgo/order" \
  -H "Content-Type: application/json" \
  -d '{
    "bundle_name": "esim_1GB_7D_TH_V2",
    "telegram_user_id": 123456789,
    "country_code": "TH",
    "country_name": "Thailand",
    "plan_id": "plan1",
    "plan_type": "standard"
  }'
```

