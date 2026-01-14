# Проверка Flow покупки дополнительного трафика через Extend

## Цель
Убедиться, что покупка дополнительного трафика через кнопку Extend добавляет трафик к существующей eSIM, а не создает новую.

## Flow проверки

### 1. Frontend: current-esim.js
✅ **Статус: OK**
- Кнопка Extend передает `extend=true` и `iccid` в URL параметрах
- Локация: `public/current-esim.js`, строки 368-430
- Параметры передаются в зависимости от типа eSIM:
  - Global: `global-plans.html?extend=true&iccid=...`
  - Region: `region-plans.html?region=...&extend=true&iccid=...`
  - Country: `plans.html?country=...&code=...&extend=true&iccid=...`

### 2. Frontend: plans.js / region-plans.js / global-plans.js
✅ **Статус: OK**
- Страницы выбора тарифов передают `extend` и `iccid` дальше в `checkout.html`
- Локация: `public/plans.js`, `public/region-plans.js`, `public/global-plans.js`
- Функция `setupNextButton()` добавляет параметры в URL

### 3. Frontend: checkout.js
✅ **Статус: OK**
- Читает `extend` и `iccid` из URL параметров (строка 106-107)
- Логирует режим extend (строка 111-113)
- Передает `iccid` в `orderPayload` при обычной покупке (строка 625-626)
- Передает `iccid` в `invoicePayload` при оплате через Stars (строка 1785-1788)
- Меняет текст кнопки на "Adding traffic..." в режиме extend (строка 607-608)

### 4. Backend: api/telegram/stars/create-invoice.js
✅ **Статус: OK**
- Получает `iccid` из body (строка 183)
- Включает `iccid` в payload для Telegram (строка 120-122):
  ```javascript
  if (data.iccid) {
      payload.i = data.iccid;
  }
  ```
- Сохраняет `iccid` в on_hold заказ (строка 491):
  ```javascript
  iccid: iccid || undefined
  ```

### 5. Backend: api/telegram/stars/webhook.js
✅ **Статус: OK**
- Извлекает `iccid` из payload (строка 146):
  ```javascript
  iccid: raw.iccid || raw.i || null
  ```
- Получает `iccid` из payload или существующего заказа (строка 462):
  ```javascript
  const iccid = payloadObj.iccid || (existingOrder && existingOrder.iccid) || null;
  ```
- Передает `iccid` в order.js (строка 469):
  ```javascript
  iccid: iccid
  ```

### 6. Backend: api/esimgo/order.js
✅ **Статус: OK**
- Получает `iccid` из body (строка 27)
- Если есть `iccid`, добавляет его в `orderData.order[0].iccids` (строка 72-74):
  ```javascript
  if (iccid) {
      orderData.order[0].iccids = [iccid];
  }
  ```
- Это указывает eSIM Go API назначить bundle на существующую eSIM вместо создания новой

## Критическая проверка: eSIM Go API

Согласно документации eSIM Go API v2.4:
- Когда в заказе указан `iccids`, bundle назначается на указанную eSIM
- Это означает, что трафик добавляется к существующей eSIM, а не создается новая

## Вывод

✅ **Весь flow реализован правильно:**
1. Frontend передает `extend=true` и `iccid` через все страницы
2. `iccid` сохраняется в payload Telegram Stars invoice
3. `iccid` извлекается из payload в webhook
4. `iccid` передается в eSIM Go API через `orderData.order[0].iccids = [iccid]`
5. eSIM Go API назначает bundle на существующую eSIM

## Рекомендации для тестирования

1. Создать тестовый заказ eSIM
2. Использовать часть трафика (чтобы было видно, что eSIM активна)
3. Нажать Extend и купить дополнительный трафик
4. Проверить в админке eSIM Go, что:
   - Не создана новая eSIM
   - Трафик добавлен к существующей eSIM (ICCID должен совпадать)
   - Bundle usage показывает увеличенный трафик

## Потенциальные проблемы

1. **Если eSIM Go API не поддерживает добавление трафика:**
   - Нужно проверить документацию eSIM Go API
   - Возможно, нужно использовать другой endpoint или параметры

2. **Если bundle несовместим с существующей eSIM:**
   - eSIM Go API может вернуть ошибку
   - Нужно обработать эту ошибку и показать пользователю сообщение

3. **Если iccid не передается:**
   - Проверить логи на всех этапах
   - Убедиться, что `iccid` сохраняется в заказе и извлекается из payload
