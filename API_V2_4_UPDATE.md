# 📋 Обновление до API v2.4

## ✅ Выполнено

1. **Создан файл спецификации**
   - `esim_go_schema_v2_4.yaml` - полная OpenAPI спецификация (5800 строк)

2. **Обновлен API Client**
   - `api/esimgo/client.js` - обновлен для работы с v2.4
   - Base URL изменен с `https://api.esim-go.com/v2` на `https://api.esim-go.com/v2.4`

3. **Обновлена документация**
   - Все ссылки на документацию обновлены с v2_0 на v2_4
   - Обновлены файлы:
     - `api/esimgo/client.js`
     - `api/esimgo/catalogue.js`
     - `api/esimgo/order.js`
     - `api/esimgo/status.js`

## 📊 Доступные Endpoints (v2.4)

### eSIMs
- `POST /esims/apply` - Применить Bundle к eSIM
- `GET /esims/assignments` - Получить детали установки eSIM
- `GET /esims/{iccid}/history` - История eSIM
- `GET /esims/{iccid}/refresh` - Обновить eSIM
- `GET /esims/{iccid}/compatible/{bundle}` - Проверить совместимость
- `POST /esims/{iccid}/sms` - Отправить SMS
- `GET /esims/{iccid}/bundles` - Список Bundle на eSIM
- `GET /esims/{iccid}/bundles/{name}` - Статус Bundle
- `DELETE /esims/{iccid}/bundles/{name}` - Отозвать Bundle
- `DELETE /esims/{iccid}/bundles/{name}/assignments/{assignmentId}` - Отозвать конкретный Bundle
- `GET /esims/{iccid}/location` - Локация eSIM
- `GET /esims/{iccid}` - Детали eSIM
- `GET /esims` - Список eSIM
- `PUT /esims` - Обновить детали eSIM

### Orders
- `GET /orders` - Список заказов
- `POST /orders` - Создать заказ
- `GET /orders/{orderReference}` - Детали заказа

### Catalogue
- `GET /catalogue` - Каталог Bundle
- `GET /catalogue/bundle/{name}` - Детали Bundle

### Inventory
- `GET /inventory` - Инвентарь Bundle
- `POST /inventory/refund` - Возврат Bundle

### Organisation
- `GET /organisation` - Детали организации
- `POST /organisation/balance` - Пополнить баланс
- `GET /organisation/groups` - Группы Bundle

### Networks
- `GET /networks` - Данные сетей по странам

### Callback
- `POST /your-usage-callback-url/` - Callback для уведомлений об использовании

## 🔄 Следующие шаги

1. Протестировать все endpoints с реальным API ключом
2. Обновить обработку ошибок согласно новой спецификации
3. Добавить поддержку новых endpoints (callback, SMS, location и т.д.)
4. Обновить типы данных согласно новым схемам

## 📚 Дополнительная информация

- OpenAPI Schema: `esim_go_schema_v2_4.yaml`
- Документация: https://docs.esim-go.com/api/v2_4/
- Base URL: `https://api.esim-go.com/v2.4`

