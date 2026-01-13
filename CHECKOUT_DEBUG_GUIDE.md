# Руководство по диагностике проблем с отображением цены на странице Checkout

## Как проверить логи после тестирования

### 1. Быстрая проверка логов checkout

Запустите скрипт для просмотра последних логов checkout:

```bash
./scripts/check-checkout-logs.sh
```

Этот скрипт покажет:
- Все запросы к API планов, связанные с checkout
- Ответы сервера с данными планов
- Информацию о ценах в планах

### 2. Прямой просмотр логов на сервере

Для более детального просмотра подключитесь к серверу:

```bash
sshpass -p "z67FPwBMJlfWg8LVzG5" ssh -o StrictHostKeyChecking=no root@37.60.228.11
```

Затем просмотрите логи:

```bash
# Последние 100 строк логов
pm2 logs esimsdata --lines 100 --nostream

# Логи в реальном времени (Ctrl+C для выхода)
pm2 logs esimsdata

# Фильтрация по checkout
pm2 logs esimsdata --lines 200 --nostream | grep -i checkout

# Фильтрация по запросам планов
pm2 logs esimsdata --lines 200 --nostream | grep "Plans API request"
```

### 3. Что искать в логах

#### ✅ Успешный запрос планов для checkout:

```
[Checkout Debug] ✅ Sending plans response to checkout: {
  country: 'AI',
  category: undefined,
  standardPlansCount: 6,
  unlimitedPlansCount: 5,
  sampleStandardPlan: {
    id: 'plan1',
    bundle_name: 'esim_1GB_7D_AI_V2',
    price: '$ 8.90',
    priceValue: 8.9
  }
}
```

#### ❌ Проблемы, на которые обратить внимание:

1. **План не найден:**
   - `standardPlansCount: 0` или `unlimitedPlansCount: 0`
   - `sampleStandardPlan: null`

2. **Цена отсутствует:**
   - `price: undefined` или `price: null`
   - `priceValue: 0` или `priceValue: undefined`

3. **Ошибка API:**
   - `Plans API error:`
   - `Failed to get plans`

4. **Проблемы с кэшем:**
   - `Using cached plans data` - проверьте, что данные в кэше актуальны

### 4. Логи на клиенте (в браузере)

Попросите пользователя открыть консоль браузера (F12) и проверить логи с префиксом `[Checkout]`:

```javascript
// Примеры логов, которые должны быть:
[Checkout] Setup order details with plan: { planId: 'plan1', price: '$ 8.90', priceValue: 8.9 }
[Checkout] updateTotalPrice called: { originalPrice: '$ 8.90', originalPriceValue: 8.9 }
[Checkout] Price updated without promo: $ 8.90
[Checkout] ✅ Price element made visible
```

### 5. Типичные проблемы и решения

#### Проблема: Цена не отображается

**Проверьте в логах:**
1. Загрузились ли планы: `Plans loaded status: true`
2. Найден ли план: `Found plan by index` или `Plan not found`
3. Установлена ли цена: `originalPrice: '$ X.XX'`

**Решение:**
- Если планы не загрузились - проверьте API запрос в логах сервера
- Если план не найден - проверьте `planId` в URL параметрах
- Если цена не установлена - проверьте структуру данных плана в ответе API

#### Проблема: Цена показывает "$ 9.99" (fallback)

**Проверьте в логах:**
- `⚠️ basePrice is 0 or NaN, using fallback`
- `⚠️ Using default fallback price: $9.99`

**Решение:**
- План не найден или цена не извлечена из данных
- Проверьте, что API возвращает правильную структуру с полем `price` или `priceValue`

### 6. Команды для быстрой диагностики

```bash
# Проверить последние checkout логи
./scripts/check-checkout-logs.sh

# Проверить все запросы планов за последний час
sshpass -p "z67FPwBMJlfWg8LVzG5" ssh root@37.60.228.11 \
  "pm2 logs esimsdata --lines 500 --nostream | grep 'Plans API request' | tail -20"

# Проверить ошибки
sshpass -p "z67FPwBMJlfWg8LVzG5" ssh root@37.60.228.11 \
  "pm2 logs esimsdata --lines 200 --nostream | grep -E '(error|Error|ERROR|failed|Failed)' | tail -30"
```

## После тестирования

1. Попросите пользователя открыть checkout страницу
2. Подождите 5-10 секунд для загрузки данных
3. Запустите `./scripts/check-checkout-logs.sh` для проверки логов
4. Проверьте, что в логах есть запись `[Checkout Debug] ✅ Sending plans response`
5. Убедитесь, что в ответе есть `price` и `priceValue` для планов
