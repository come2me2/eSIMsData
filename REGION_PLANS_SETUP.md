# Настройка региональных тарифов

## Обзор

Система региональных тарифов использует маппинг регионов приложения на регионы API eSIM Go и возвращает только fixed тарифы (без unlimited) для региональных eSIM.

## Маппинг регионов

Регионы приложения маппятся на регионы API следующим образом:

- **Africa** → `Africa`
- **Asia** → `Asia`
- **Europe** → `EU Lite` (не берем `EU+`)
- **North America** → `North America`
- **Latin America** → `Americas`, `Caribbean`, `CENAM` (с дедупликацией по минимальной цене)
- **Oceania** → `Oceania`
- **Balkanas** → `Balkanas`
- **Central Eurasia** → `CIS`

## Дедупликация для Latin America

Для региона Latin America используется специальная логика дедупликации:
- Тарифы получаются из трех регионов API: `Americas`, `Caribbean`, `CENAM`
- Для каждой комбинации страны/данных/длительности выбирается тариф с минимальной ценой
- Пример: El Salvador (SV) - если есть тарифы из Americas ($9.99) и CENAM ($9.79), выбирается CENAM

## API Endpoint

### GET `/api/esimgo/region-plans`

**Параметры:**
- `region` (обязательный) - название региона приложения

**Ответ:**
```json
{
  "success": true,
  "data": {
    "standard": [...], // Только fixed тарифы
    "unlimited": [],   // Всегда пустой массив для регионов
    "total": 10
  },
  "meta": {
    "region": "Latin America",
    "apiRegions": ["Americas", "Caribbean", "CENAM"],
    "bundlesCount": 15
  }
}
```

## Excel файл

Excel файл `Rate_Sheet_November_2025_Standard_babe40b098.xlsx` содержит:
- Вкладка "Regional Bundles" - региональные тарифы
- Вкладка "standard fixed" - все тарифы с фиксированным трафиком из регионов

**Примечание:** Парсинг Excel файла пока не реализован полностью. Нужно адаптировать функции в `api/esimgo/parse-excel.js` под реальную структуру файла.

## Установка зависимостей

Для работы с Excel файлом требуется библиотека `xlsx`:

```bash
npm install xlsx
```

## Использование

Frontend использует новый endpoint автоматически через функцию `loadPlansFromAPI()` в `public/region-plans.js`.

