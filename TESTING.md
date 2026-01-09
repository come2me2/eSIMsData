# Инструкция по тестированию новой логики статусов заказов

## 1. Тестирование создания заказа ON_HOLD при создании invoice

### Шаг 1: Создание invoice через Telegram Stars
1. Откройте Telegram Mini App
2. Выберите план eSIM
3. Нажмите "Buy with Stars"
4. **Проверьте**: В админке должен появиться заказ со статусом `on_hold`
5. **Проверьте поля заказа**:
   - `status: "on_hold"`
   - `payment_session_id` должен содержать invoice ID
   - `payment_status: "pending"`
   - `expires_at` должен быть установлен (через 5 минут от создания)
   - `payment_confirmed: false`
   - `esim_issued: false`

### Проверка через API:
```bash
# Проверить заказы пользователя
curl http://localhost:3000/api/orders?telegram_user_id=YOUR_USER_ID
```

### Проверка через файл:
```bash
# Посмотреть заказы в файле
cat data/orders.json | jq '."YOUR_USER_ID"'
```

## 2. Тестирование обновления заказа после оплаты

### Шаг 1: Оплата invoice
1. В Telegram Mini App оплатите созданный invoice
2. **Проверьте**: Заказ должен обновиться

### Шаг 2: Проверка статуса после оплаты
**Если eSIM выдана сразу:**
- `status: "completed"`
- `payment_status: "succeeded"`
- `payment_confirmed: true`
- `esim_issued: true`
- `expires_at: null`
- Должны быть заполнены: `iccid`, `matchingId`, `smdpAddress`, `qrCode`

**Если eSIM еще не выдана:**
- `status: "on_hold"` (остается)
- `payment_status: "succeeded"`
- `payment_confirmed: true`
- `esim_issued: false`
- `expires_at: null`

### Проверка логов:
```bash
# На сервере проверьте логи
pm2 logs esimsdata --lines 50
```

## 3. Тестирование таймаутов

### Шаг 1: Создайте заказ on_hold
Создайте invoice, но НЕ оплачивайте его.

### Шаг 2: Запустите скрипт проверки таймаутов
```bash
# Вручную
node scripts/check-order-timeouts.js

# Или через cron (каждую минуту)
# Добавьте в crontab:
# * * * * * cd /path/to/esimsdata && node scripts/check-order-timeouts.js
```

### Шаг 3: Проверка результата
**Если таймаут истек (прошло > 5 минут):**
- `status: "canceled"`
- `canceled_reason: "timeout"`
- `expires_at` должен быть в прошлом

**Если таймаут еще не истек:**
- `status: "on_hold"` (остается)
- В логах должно быть сообщение о времени до истечения

## 4. Тестирование статуса FAILED

### Тест 1: Ошибка при создании заказа в eSIM Go
1. Создайте invoice и оплатите его
2. Симулируйте ошибку в eSIM Go API (временно измените API ключ)
3. **Проверьте**: Заказ должен получить статус `failed`
4. **Проверьте поля**:
   - `status: "failed"`
   - `failed_reason: "esim_order_creation_failed"` или `"esim_order_creation_error"`
   - `payment_status: "succeeded"` (платеж прошел, но заказ не создан)
   - `payment_confirmed: true`
   - `esim_issued: false`

### Тест 2: Ошибка валидации pre_checkout_query
1. Создайте invoice с неверным payload
2. **Проверьте**: Заказ должен получить статус `failed`
3. **Проверьте поля**:
   - `status: "failed"`
   - `failed_reason: "Invalid payload"` или `"Price mismatch"`

## 5. Тестирование статуса CANCELED

### Тест 1: Таймаут
См. раздел 3 "Тестирование таймаутов"

### Тест 2: Ручная отмена через админку
1. Откройте админку → Orders
2. Найдите заказ со статусом `on_hold`
3. Измените статус на `canceled`
4. **Проверьте**: Статус должен обновиться
5. **Проверьте поля**:
   - `status: "canceled"`
   - `canceled_reason` может быть установлен вручную

## 6. Тестирование UI админки

### Шаг 1: Проверка отображения статусов
1. Откройте админку → Orders
2. **Проверьте цвета статусов**:
   - `on_hold` - желтый (#FEF3C7)
   - `completed` - зеленый (#D1FAE5)
   - `failed` - красный (#FEE2E2)
   - `canceled` - серый (#F3F4F6)

### Шаг 2: Проверка деталей заказа
1. Откройте заказ (кнопка "Details")
2. **Проверьте отображение**:
   - Для `on_hold`: время до истечения таймаута
   - Для `failed`: причина ошибки (`failed_reason`)
   - Для `canceled`: причина отмены (`canceled_reason`)
   - Статус платежа (`payment_status`)
   - Подтверждение платежа (`payment_confirmed`)
   - Выдача eSIM (`esim_issued`)

### Шаг 3: Изменение статуса
1. В деталях заказа измените статус через dropdown
2. **Проверьте**: Статус должен обновиться после сохранения

## 7. Автоматизированное тестирование

### Запуск тестового скрипта:
```bash
node scripts/test-order-statuses.js
```

Этот скрипт проверит:
- Создание заказа on_hold
- Обновление заказа после оплаты
- Проверку таймаутов
- Все статусы

## 8. Проверка через базу данных

### Просмотр всех заказов:
```bash
cat data/orders.json | jq '.'
```

### Поиск заказов по статусу:
```bash
cat data/orders.json | jq '.[] | .[] | select(.status == "on_hold")'
cat data/orders.json | jq '.[] | .[] | select(.status == "failed")'
cat data/orders.json | jq '.[] | .[] | select(.status == "canceled")'
```

### Поиск заказов с истекшим таймаутом:
```bash
node -e "
const fs = require('fs');
const orders = JSON.parse(fs.readFileSync('data/orders.json', 'utf8'));
const now = new Date();
for (const userId in orders) {
  orders[userId].forEach(order => {
    if (order.status === 'on_hold' && order.expires_at) {
      const expires = new Date(order.expires_at);
      if (expires < now) {
        console.log('Expired order:', order.orderReference, 'expired at', order.expires_at);
      }
    }
  });
}
"
```

## 9. Мониторинг в реальном времени

### Логи PM2:
```bash
pm2 logs esimsdata --lines 100
```

### Фильтрация логов по ключевым словам:
```bash
pm2 logs esimsdata | grep -E "(on_hold|completed|failed|canceled|timeout)"
```

## 10. Чеклист тестирования

- [ ] Заказ создается со статусом `on_hold` при создании invoice
- [ ] Заказ обновляется после успешной оплаты
- [ ] Статус `completed` устанавливается только при наличии eSIM
- [ ] Статус `failed` устанавливается при ошибках
- [ ] Статус `canceled` устанавливается при таймауте
- [ ] Таймауты работают корректно (5 мин для Stars)
- [ ] UI админки отображает все статусы правильно
- [ ] Детали заказа показывают всю необходимую информацию
- [ ] Можно изменить статус вручную через админку
- [ ] Логи содержат достаточно информации для отладки

