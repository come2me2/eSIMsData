# Исправление верстки страницы Payments на мобильных устройствах

## Проблемы
1. ❌ Верстка "ехала" на мобильных экранах
2. ❌ Индикаторы включения (toggle switches) располагались посередине
3. ❌ Индикаторы были слишком крупными на некоторых экранах
4. ❌ Поля ввода и текст не помещались на маленьких экранах

## Решения

### 1. Исправлено расположение toggle switches

**Проблема:** Toggle switches выходили за границы контейнера или располагались неправильно.

**Решение:**
```css
/* Toggle switch позиционирование */
#paymentCardTelegramStars label.relative,
#paymentCardCrypto label.relative,
#paymentCardBankCard label.relative {
    flex-shrink: 0;
    margin-left: auto; /* Прижимаем к правому краю */
}
```

### 2. Уменьшен размер toggle switches на мобильных

**Таблеты (≤768px):**
- Ширина: 40px (было 44px)
- Высота: 22px (было 24px)
- Круг внутри: 16px

**Мобильные (≤480px):**
- Ширина: 36px
- Высота: 20px
- Круг внутри: 14px

```css
@media (max-width: 768px) {
    #paymentCardTelegramStars label.relative > div,
    #paymentCardCrypto label.relative > div,
    #paymentCardBankCard label.relative > div {
        width: 2.5rem !important; /* 40px */
        height: 1.375rem !important; /* 22px */
    }
}

@media (max-width: 480px) {
    /* Еще меньше на маленьких экранах */
    width: 2.25rem !important; /* 36px */
    height: 1.25rem !important; /* 20px */
}
```

### 3. Исправлено расположение элементов в карточках

**Проблема:** Flex контейнеры складывались вертикально, нарушая layout.

**Решение:**
```css
/* Карточки платежных методов сохраняют горизонтальное расположение */
#paymentCardTelegramStars .flex.items-center.justify-between,
#paymentCardCrypto .flex.items-center.justify-between,
#paymentCardBankCard .flex.items-center.justify-between {
    flex-direction: row !important;
    align-items: center !important;
    flex-wrap: wrap;
    gap: 0.75rem;
}
```

### 4. Убрано большое левое отступление на мобильных

**Проблема:** `.pl-14` (3.5rem = 56px) было слишком много для мобильных.

**Решение:**
```css
#paymentCardTelegramStars .pl-14,
#paymentCardCrypto .pl-14,
#paymentCardBankCard .pl-14 {
    padding-left: 0 !important;
    padding-top: 1rem;
    margin-top: 1rem;
    border-top: 1px solid #e5e7eb; /* Визуальное разделение */
}
```

### 5. Адаптивные поля ввода

**Проблема:** Фиксированная ширина `w-32` не подходила для мобильных.

**Решение:**
```css
#paymentCardTelegramStars .w-32,
#paymentCardCrypto .w-32,
#paymentCardBankCard .w-32 {
    width: 100% !important;
    max-width: 10rem; /* Таблеты */
}

@media (max-width: 480px) {
    max-width: 8rem; /* Мобильные */
}
```

### 6. Вертикальное расположение полей ввода

**Проблема:** Инпут и пояснительный текст не помещались горизонтально.

**Решение:**
```css
#paymentCardTelegramStars .flex.items-center.gap-3,
#paymentCardCrypto .flex.items-center.gap-3,
#paymentCardBankCard .flex.items-center.gap-3 {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 0.5rem !important;
}
```

### 7. Уменьшены отступы карточек

**Проблема:** Слишком большие отступы занимали много места.

**Решение:**
```css
@media (max-width: 768px) {
    .border.rounded-lg.p-6 {
        padding: 1rem !important;
    }
}

@media (max-width: 480px) {
    .border.rounded-lg.p-6 {
        padding: 0.75rem !important;
    }
}
```

### 8. Уменьшен размер иконок

```css
img[alt="Telegram Stars"],
img[alt="Crypto"],
img[alt="Bank Cards"] {
    width: 2rem !important; /* 32px вместо 40px */
    height: 2rem !important;
}
```

### 9. Компактные заголовки

```css
@media (max-width: 480px) {
    #paymentCardTelegramStars .text-base,
    #paymentCardCrypto .text-base,
    #paymentCardBankCard .text-base {
        font-size: 0.875rem !important;
        line-height: 1.25rem;
    }
}
```

## Breakpoints

| Размер экрана | Поведение |
|---------------|-----------|
| **> 768px** | Десктоп - стандартные размеры |
| **≤ 768px** | Таблет - уменьшенные toggle switches (40px), адаптивные поля |
| **≤ 640px** | Маленькие таблеты - дополнительные оптимизации |
| **≤ 480px** | Мобильные - минимальные размеры toggle (36px), компактные отступы |

## Тестирование

### Рекомендуемые разрешения для проверки:
- 📱 iPhone SE: 375x667
- 📱 iPhone 12/13: 390x844
- 📱 Samsung Galaxy: 360x640
- 📱 iPad Mini: 768x1024
- 📱 iPad: 1024x768

### Что проверить:
1. ✅ Toggle switches правильно расположены справа
2. ✅ Toggle switches не слишком крупные
3. ✅ Все элементы помещаются на экран
4. ✅ Поля ввода читаемы
5. ✅ Текст не обрезается
6. ✅ Карточки выглядят аккуратно
7. ✅ Верстка не "ехала"

## Затронутые файлы
- `/admin/css/admin.css` - добавлены медиа-запросы и специфичные стили для payment cards

## CSS Селекторы

### Основные селекторы для payment cards:
- `#paymentCardTelegramStars`
- `#paymentCardCrypto`
- `#paymentCardBankCard`

### Структура DOM:
```html
<div id="paymentCardTelegramStars">
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
            <!-- Иконка и заголовок -->
        </div>
        <label class="relative inline-flex items-center">
            <input type="checkbox" />
            <div><!-- Toggle switch --></div>
        </label>
    </div>
    <div class="pl-14"><!-- Поля наценки --></div>
</div>
```

