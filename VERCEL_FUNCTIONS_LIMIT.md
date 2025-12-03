# ⚠️ Лимит Serverless Functions на Vercel Hobby

## Проблема
Vercel Hobby план ограничивает количество Serverless Functions до 12 на деплой.

## Решение
Удалены неиспользуемые функции:
- ✅ `api/esimgo/catalogue-alt.js` - альтернативная версия (не используется)
- ✅ `api/esimgo/debug.js` - отладочная функция (дублирует catalogue-debug.js)
- ✅ `api/esimgo/parse-openapi.js` - утилита (не endpoint)

## Текущие функции (9)

### eSIM Go API
1. `api/esimgo/bundles.js` - Получение тарифов для страны
2. `api/esimgo/catalogue.js` - Сырой каталог
3. `api/esimgo/catalogue-processed.js` - Обработанный каталог
4. `api/esimgo/catalogue-debug.js` - Отладка каталога
5. `api/esimgo/countries.js` - Список стран
6. `api/esimgo/order.js` - Создание заказа
7. `api/esimgo/status.js` - Статус заказа
8. `api/esimgo/test.js` - Тестирование подключения

### Другие
9. `api/validate-telegram.js` - Валидация Telegram

## Примечание
`api/esimgo/client.js` - это модуль, а не endpoint, поэтому не считается функцией.

## Если нужно больше функций

### Вариант 1: Объединить функции
Можно объединить похожие функции в одну:
- `catalogue.js` + `catalogue-processed.js` → один endpoint с параметром `?processed=true`
- `catalogue-debug.js` можно добавить как параметр в `catalogue.js`

### Вариант 2: Удалить отладочные функции
- `catalogue-debug.js` - можно удалить после отладки
- `test.js` - можно удалить после тестирования

### Вариант 3: Перейти на Pro план
Pro план позволяет неограниченное количество функций.

## Проверка
После удаления функций должно быть 9 функций, что в пределах лимита 12.

