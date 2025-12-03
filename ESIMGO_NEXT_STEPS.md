# 🚀 Следующие шаги интеграции eSIM Go API

## ✅ Что уже готово

1. **Базовый клиент API** (`api/esimgo/client.js`)
   - Аутентификация через `X-API-Key`
   - Методы: `getCatalogue()`, `createOrder()`, `getOrderStatus()`, `getESIMInfo()`, `createESIM()`

2. **API Endpoints** (Vercel Serverless Functions):
   - `/api/esimgo/catalogue` - Получение каталога продуктов
   - `/api/esimgo/order` - Создание заказа
   - `/api/esimgo/status` - Проверка статуса заказа

3. **Конфигурация** (`esimgo-config.example.js`)

## 📋 Что нужно сделать дальше

### 1. Настроить переменные окружения в Vercel

1. Зайдите в Vercel Dashboard → ваш проект → Settings → Environment Variables
2. Добавьте:
   ```
   ESIMGO_API_KEY = ваш_api_ключ_от_esimgo
   ESIMGO_API_URL = https://api.esim-go.com/v2 (опционально)
   ```
3. Передеплойте проект

### 2. Протестировать API endpoints

Используйте Postman или curl для тестирования:

```bash
# Получить каталог продуктов
curl -H "X-API-Key: YOUR_API_KEY" \
  https://your-project.vercel.app/api/esimgo/catalogue?country=TH

# Создать заказ (после получения bundle_id из каталога)
curl -X POST \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"bundle_id": "bundle_id_from_catalogue"}' \
  https://your-project.vercel.app/api/esimgo/order
```

### 3. Маппинг планов на продукты eSIM Go

Нужно создать соответствие между нашими планами и `bundle_id` из каталога eSIM Go:

```javascript
// Пример маппинга (создать в отдельном файле)
const planMapping = {
  'TH': { // Таиланд
    'plan1': { // 1 GB, 7 Days
      bundle_id: 'bundle_id_from_catalogue',
      data: '1 GB',
      duration: '7 Days'
    },
    'plan2': { // 2 GB, 7 Days
      bundle_id: 'bundle_id_from_catalogue',
      data: '2 GB',
      duration: '7 Days'
    },
    // ...
  }
};
```

### 4. Интеграция с фронтендом

#### 4.1 Обновить `checkout.js`

Заменить мок-данные на реальный API вызов:

```javascript
// В функции setupPurchaseButton(), после валидации Telegram
const response = await fetch('/api/esimgo/order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bundle_id: getBundleIdForPlan(orderData.planId, orderData.code),
    telegram_user_id: auth.getUserId(),
    country_code: orderData.code,
    country_name: orderData.name,
    plan_id: orderData.planId,
    plan_type: orderData.planType
  })
});

const result = await response.json();
if (result.success) {
  // Сохранить order_id, показать QR код
  // Перенаправить на страницу успеха
}
```

#### 4.2 Создать страницу успешного заказа

Показать:
- QR код для установки eSIM
- Инструкции по активации
- Ссылку на "Мои eSIM"

### 5. Хранение заказов

Выбрать решение для хранения:
- **Vercel KV** (Redis) - для временных данных
- **Vercel Postgres** - для постоянного хранения
- **Supabase** - альтернатива Postgres

Создать схему:
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  esimgo_order_id VARCHAR(255),
  bundle_id VARCHAR(255),
  country_code VARCHAR(2),
  plan_id VARCHAR(50),
  status VARCHAR(50),
  qr_code TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 6. Webhooks (опционально)

Если eSIM Go поддерживает webhooks для уведомлений о статусе заказов:
- Создать `/api/esimgo/webhook.js`
- Настроить URL в dashboard eSIM Go
- Обновлять статусы заказов автоматически

## 📚 Полезные ссылки

- **Документация API**: https://docs.esim-go.com/
- **API Reference v2.0**: https://docs.esim-go.com/api/v2_0/
- **Portal**: https://portal.esim-go.com/
- **Help Center**: https://help.esim-go.com/

## ⚠️ Важно

1. **Баланс аккаунта**: Убедитесь, что на аккаунте eSIM Go есть достаточный баланс для тестирования
2. **Тестирование**: Начните с малых сумм и тестовых заказов
3. **Обработка ошибок**: Всегда обрабатывайте ошибки API и показывайте понятные сообщения пользователям
4. **Безопасность**: Никогда не передавайте API ключ на фронтенд

## 🎯 Приоритет задач

1. **Высокий**: Настроить переменные окружения и протестировать API
2. **Высокий**: Создать маппинг планов на bundle_id
3. **Средний**: Интегрировать с checkout.js
4. **Средний**: Настроить хранение заказов
5. **Низкий**: Webhooks и автоматическое обновление статусов

