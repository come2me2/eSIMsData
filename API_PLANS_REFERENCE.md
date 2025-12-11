# Памятка: Источники данных тарифов по API

## Общая информация

Все тарифы загружаются из eSIM Go API через группы (groups) каталога. Используются две основные группы:
- **Standard Fixed** - тарифы с фиксированным объемом данных (1GB, 2GB, 3GB и т.д.)
- **Standard Unlimited Essential** - безлимитные тарифы (1GB высокоскоростного трафика в день, затем безлимит на 1.25 Mbps)

---

## 1. REGION (Региональные тарифы)

### Endpoint
```
GET /api/esimgo/region-plans?region={regionName}
```

### Параметры
- `region` - название региона приложения:
  - `Africa`
  - `Asia`
  - `Europe`
  - `North America`
  - `Latin America`
  - `Oceania`
  - `Balkanas`
  - `Central Eurasia`

### Группы данных
Загружаются **обе группы** параллельно:
- ✅ **Standard Fixed** (все страницы с пагинацией)
- ✅ **Standard Unlimited Essential** (все страницы с пагинацией)

### Фильтрация
После загрузки всех bundles из обеих групп, применяется фильтрация по региону API:

**Маппинг регионов приложения на регионы API:**
- `Africa` → `Africa`
- `Asia` → `Asia`
- `Europe` → `EU Lite` (также: Europe Lite, Europe, EU, EUL)
- `North America` → `North America` (также: NorthAmerica)
- `Latin America` → `Americas` (также: America, LATAM, Latin America) + `Caribbean` (также: Carib) + `CENAM` (также: Central America)
- `Oceania` → `Oceania`
- `Balkanas` → `Balkanas` (также: Balkans)
- `Central Eurasia` → `CIS` (также: Central Eurasia)

**Логика фильтрации:**
- Ищет bundles, где `country.name` или `country.iso` = название региона API
- Проверяет поле `country.region` для Europe
- Проверяет паттерны в названии bundle (например, `_RAS_` для Asia)

### Файл
`api/esimgo/region-plans.js`

---

## 2. LOCAL (Локальные тарифы для одной страны)

### Endpoint
```
GET /api/esimgo/plans?country={countryCode}&category=local
```

### Параметры
- `country` - ISO код страны (например: `TH`, `US`, `FR`)
- `category=local` - явно указывает тип запроса

### Группы данных
Загружаются **обе группы** последовательно с пагинацией:
- ✅ **Standard Fixed** (все страницы, до 50 страниц)
- ✅ **Standard Unlimited Essential** (все страницы, до 50 страниц)

### Фильтрация
После загрузки всех bundles применяется фильтрация по коду страны через функцию `isLocalBundle()`:

**Логика фильтрации:**
1. Проверяет паттерн в названии bundle (например, `esim_1GB_7D_TH_V2` для Thailand)
2. Проверяет массив `countries` - должен содержать только одну страну с указанным кодом
3. Проверяет поле `bundle.country` / `bundle.countryCode` / `bundle.iso`
4. Специальная обработка для Cyprus (CY) и Northern Cyprus (CYP)

**Критерии Local bundle:**
- Bundle содержит **только одну страну**
- Код страны в bundle совпадает с запрошенным `countryCode`
- Название bundle содержит код страны (например, `_TH_`, `_US_`)

### Файл
`api/esimgo/plans.js` (секция `isLocal`)

---

## 3. GLOBAL (Глобальные тарифы для множества стран)

### Endpoint
```
GET /api/esimgo/plans?category=global
```

### Параметры
- `category=global` - указывает тип запроса

### Группы данных
Загружаются **обе группы** параллельно с пагинацией:
- ✅ **Standard Fixed** (все страницы, батчами по 5 страниц)
- ✅ **Standard Unlimited Essential** (все страницы, батчами по 5 страниц)

### Фильтрация
После загрузки всех bundles применяется фильтрация через функцию `isGlobalBundle()`:

**Логика фильтрации:**
1. Проверяет наличие слова "Global" в названии bundle (`bundle.name`)
2. Проверяет наличие слова "Global" в описании bundle (`bundle.description`)
3. Проверяет массив `countries` - ищет объект с `country.name = "Global"` или `country.iso = "GLOBAL"`
4. Проверяет паттерны в названии: `RGB`, `RGBS` (Global bundles)

**Критерии Global bundle:**
- Название или описание содержит "Global"
- В массиве countries есть страна с названием "Global"
- Название bundle содержит паттерны `RGB` или `RGBS`

**Список поддерживаемых стран:**
Используется предопределенный список из **106 стран** (не из API):
- AT, DK, IE, IT, SE, IM, FR, BG, CY, EE, FI, GR, HU, LV, LT, NL, NO, PL, RO, SK
- ES, GB, TR, DE, MT, CH, BE, HR, CZ, LI, LU, PT, SI, IS, UA, JE, SG, MO, HK, IL
- AX, ID, VN, RU, AE, AU, TH, TW, LK, MY, PK, UZ, EG, NZ, AL, KR, CA, KZ, MD, MK
- KW, MX, GG, JO, OM, GI, MA, BR, CL, RS, JP, ME, GU, US, TZ, UG, CR, EC, NI, IN
- AR, SV, PE, UY, CN, PA, RE, TN, BA, ZA, ZM, MG, NG, KE, AD, IQ, QA, SC, MU, CO
- GT, CM, GY, SA, PY, BO

### Файл
`api/esimgo/plans.js` (секция `isGlobal`)

---

## Сравнительная таблица

| Тип | Endpoint | Группы | Фильтрация | Кэш ключ |
|-----|----------|--------|------------|----------|
| **Region** | `/api/esimgo/region-plans?region=...` | Standard Fixed<br>Standard Unlimited Essential | По региону API (Africa, Asia, EU Lite и т.д.) | `plans:region:{region}` |
| **Local** | `/api/esimgo/plans?country=XX&category=local` | Standard Fixed<br>Standard Unlimited Essential | По коду страны (одна страна) | `plans:local:{countryCode}` |
| **Global** | `/api/esimgo/plans?category=global` | Standard Fixed<br>Standard Unlimited Essential | По наличию "Global" в названии/описании | `plans:global` |

---

## Дополнительная информация

### Пагинация
- Все группы загружаются с пагинацией (perPage=1000)
- Максимум 50 страниц для Local
- Параллельная загрузка батчами по 5 страниц для Global
- Последовательная загрузка для Region и Local

### Кэширование
- **Серверный кэш**: In-memory кэш с TTL 24 часа
- **Клиентский кэш**: localStorage с TTL 24 часа (для Region, Global, Countries)
- Ключи кэша уникальны для каждого типа и параметров

### Обработка цен
- Цены извлекаются из поля `bundle.price`
- Если цена в центах (>100 и <100000, целое число), конвертируется в доллары
- Валюты: USD (по умолчанию) или из `bundle.currency`

### Группировка в планы
После фильтрации bundles группируются в планы:
- **Standard планы**: по `dataAmount` и `duration` (дедупликация)
- **Unlimited планы**: по `duration` (дедупликация)
- Добавляются ID: `plan1`, `plan2`, ... для standard и `unlimited1`, `unlimited2`, ... для unlimited

---

## Файлы кода

- **Region**: `api/esimgo/region-plans.js`
- **Local**: `api/esimgo/plans.js` (секция `isLocal`)
- **Global**: `api/esimgo/plans.js` (секция `isGlobal`)
- **Клиент API**: `api/_lib/esimgo/client.js`
- **Кэш**: `api/_lib/cache.js`

---

*Последнее обновление: 2025-12-11*

