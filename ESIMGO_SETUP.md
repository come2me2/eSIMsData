# 🚀 Настройка подключения к eSIM Go API

## ✅ Что уже готово

1. **API Client** (`api/esimgo/client.js`) - базовый клиент для работы с API
2. **API Endpoints**:
   - `/api/esimgo/catalogue` - сырой каталог
   - `/api/esimgo/catalogue-processed` - обработанный каталог (страны, регионы, тарифы)
   - `/api/esimgo/countries` - список всех стран
   - `/api/esimgo/bundles?country=TH` - тарифы для конкретной страны
3. **Тестовая страница** (`test-esimgo.html`) - для проверки подключения

## 📋 Шаг 1: Настройка переменных окружения в Vercel

1. Зайдите в [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **Settings** → **Environment Variables**
4. Добавьте переменную:
   ```
   Name: ESIMGO_API_KEY
   Value: ваш_api_ключ_от_esimgo
   Environment: Production, Preview, Development (выберите все)
   ```
5. Нажмите **Save**
6. Передеплойте проект (Vercel сделает это автоматически при следующем коммите)

## 🧪 Шаг 2: Тестирование подключения

### Вариант 1: Через тестовую страницу

1. Откройте `https://your-project.vercel.app/test-esimgo.html`
2. Нажмите "Проверить подключение"
3. Если всё работает, вы увидите ✅

### Вариант 2: Через curl/Postman

```bash
# Проверка подключения (получить каталог для Таиланда)
curl -H "X-API-Key: YOUR_API_KEY" \
  https://api.esim-go.com/v2/catalogue?country=TH

# Или через наш endpoint
curl https://your-project.vercel.app/api/esimgo/catalogue?country=TH
```

## 📊 Шаг 3: Использование API endpoints

### Получить список всех стран

```javascript
const response = await fetch('/api/esimgo/countries');
const data = await response.json();
console.log(data.data); // Массив стран
```

### Получить тарифы для страны

```javascript
const response = await fetch('/api/esimgo/bundles?country=TH');
const data = await response.json();
console.log(data.data); // Массив тарифов для Таиланда
```

### Получить обработанный каталог (страны + регионы + тарифы)

```javascript
const response = await fetch('/api/esimgo/catalogue-processed');
const data = await response.json();
console.log(data.data.countries); // Все страны
console.log(data.data.regions); // Группировка по регионам
console.log(data.data.bundles); // Все тарифы
```

### Получить каталог для региона

```javascript
const response = await fetch('/api/esimgo/catalogue-processed?region=Asia');
const data = await response.json();
console.log(data.data); // Страны и тарифы для Азии
```

## 🔍 Структура данных

### Страна (Country)
```json
{
  "code": "TH",
  "name": "Thailand",
  "bundlesCount": 15
}
```

### Тариф (Bundle)
```json
{
  "id": "bundle_123",
  "name": "5 GB",
  "data": "5 GB",
  "dataAmount": 5,
  "dataUnit": "GB",
  "duration": "30 Days",
  "validity": 30,
  "validityUnit": "Days",
  "price": {
    "amount": 9.99,
    "currency": "USD",
    "formatted": "USD 9.99"
  },
  "country": "TH",
  "countryName": "Thailand"
}
```

### Обработанный каталог
```json
{
  "countries": [...],
  "regions": {
    "Asia": {
      "name": "Asia",
      "countries": [...]
    },
    "Europe": {
      "name": "Europe",
      "countries": [...]
    }
  },
  "bundles": [...],
  "totalCountries": 150,
  "totalBundles": 500
}
```

## ⚠️ Важные моменты

1. **API Key**: Никогда не коммитьте API ключ в код! Используйте только переменные окружения Vercel.

2. **Обработка ошибок**: Всегда проверяйте `response.ok` и `data.success`:
   ```javascript
   if (response.ok && data.success) {
     // Успех
   } else {
     // Ошибка: data.error
   }
   ```

3. **Коды стран**: Используйте ISO 3166-1 alpha-2 (2 буквы): `TH`, `US`, `GB`, и т.д.

4. **Регионы**: Автоматическая группировка по регионам:
   - Africa
   - Asia
   - Europe
   - Latin America
   - North America
   - Balkanas
   - Central Eurasia
   - Oceania

## 🐛 Отладка

Если что-то не работает:

1. **Проверьте переменные окружения** в Vercel Dashboard
2. **Проверьте логи** в Vercel Dashboard → Functions → Logs
3. **Используйте тестовую страницу** `test-esimgo.html` для проверки каждого endpoint
4. **Проверьте API ключ** - он должен быть активным в eSIM Go portal

## 📚 Дополнительная информация

- **Документация eSIM Go**: https://docs.esim-go.com/
- **API Reference v2.0**: https://docs.esim-go.com/api/v2_0/
- **Portal**: https://portal.esim-go.com/

## ✅ Следующие шаги

После успешного подключения:

1. ✅ Настроить подключение к API - **ГОТОВО**
2. ✅ Получение списка стран, регионов, тарифов - **ГОТОВО**
3. ⏳ Маппинг планов на bundle_id из eSIM Go
4. ⏳ Интеграция с checkout.js для реальных покупок
5. ⏳ Настройка хранения заказов

