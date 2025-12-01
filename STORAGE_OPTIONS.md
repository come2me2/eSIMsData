# 📦 Где хранить заказы? Варианты для Vercel

## 🔍 Текущая ситуация

Сейчас заказы **не сохраняются** — они только логируются в консоль браузера:
- В `checkout.js` закомментирован код отправки на сервер
- В `my-esims.js` используются моковые данные (`esimsData`)

## ✅ Варианты хранения заказов на Vercel

### 1. 🚀 Vercel Serverless Functions (Рекомендуется)

**Плюсы:**
- ✅ Встроено в Vercel (бесплатно до 100GB-hours/месяц)
- ✅ Автоматическое масштабирование
- ✅ HTTPS из коробки
- ✅ Простая интеграция с базой данных

**Минусы:**
- ⚠️ Нужна внешняя БД (не входит в Vercel)

**Как реализовать:**

1. Создать API endpoint: `api/orders.js`
```javascript
// api/orders.js
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const order = req.body;
    
    // Валидация Telegram initData (для безопасности)
    // Сохранение в БД (см. варианты БД ниже)
    
    return res.status(200).json({ success: true, orderId: '...' });
  }
  
  if (req.method === 'GET') {
    const { userId } = req.query;
    // Загрузка заказов пользователя из БД
    return res.status(200).json({ orders: [...] });
  }
}
```

2. Обновить `checkout.js`:
```javascript
// Раскомментировать и обновить:
fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderWithUser)
})
.then(res => res.json())
.then(data => {
    console.log('Order saved:', data);
    // Перенаправить на страницу успеха
});
```

**Стоимость:** Бесплатно (до лимитов Vercel)

---

### 2. 🔥 Firebase / Firestore (Google)

**Плюсы:**
- ✅ Бесплатный тариф (1GB хранилища, 50K чтений/день)
- ✅ Real-time обновления
- ✅ Простая интеграция
- ✅ Встроенная аутентификация

**Минусы:**
- ⚠️ Нужен аккаунт Google
- ⚠️ При росте — платные тарифы

**Как подключить:**

1. Установить Firebase:
```bash
npm install firebase
```

2. Создать `firebase-config.js`:
```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  // ...
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

3. Сохранять заказы:
```javascript
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase-config';

// Сохранение
await addDoc(collection(db, 'orders'), orderWithUser);

// Загрузка
const q = query(collection(db, 'orders'), where('telegram_user_id', '==', userId));
const snapshot = await getDocs(q);
```

**Стоимость:** Бесплатно до 1GB + 50K операций/день

---

### 3. 🟢 Supabase (PostgreSQL)

**Плюсы:**
- ✅ Бесплатный тариф (500MB БД, 2GB bandwidth)
- ✅ PostgreSQL (SQL)
- ✅ Real-time подписки
- ✅ Встроенная аутентификация
- ✅ REST API из коробки

**Минусы:**
- ⚠️ Нужен аккаунт

**Как подключить:**

1. Установить:
```bash
npm install @supabase/supabase-js
```

2. Создать `supabase-config.js`:
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);
```

3. Сохранять заказы:
```javascript
const { data, error } = await supabase
  .from('orders')
  .insert([orderWithUser]);

// Загрузка
const { data: orders } = await supabase
  .from('orders')
  .select('*')
  .eq('telegram_user_id', userId);
```

**Стоимость:** Бесплатно до 500MB БД

---

### 4. 🟡 MongoDB Atlas

**Плюсы:**
- ✅ Бесплатный тариф (512MB хранилища)
- ✅ NoSQL (гибкая схема)
- ✅ Простая интеграция

**Минусы:**
- ⚠️ Нужен аккаунт MongoDB

**Как подключить:**

1. Установить:
```bash
npm install mongodb
```

2. Создать Vercel Serverless Function:
```javascript
// api/orders.js
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export default async function handler(req, res) {
  await client.connect();
  const db = client.db('esim');
  const orders = db.collection('orders');
  
  if (req.method === 'POST') {
    await orders.insertOne(req.body);
    return res.json({ success: true });
  }
}
```

**Стоимость:** Бесплатно до 512MB

---

### 5. 📝 JSON файл на GitHub (для тестирования)

**Плюсы:**
- ✅ Полностью бесплатно
- ✅ Просто для теста

**Минусы:**
- ❌ Не для продакшена
- ❌ Нет безопасности
- ❌ Медленно

**Только для прототипирования!**

---

## 🎯 Рекомендация для вашего проекта

### Для начала (MVP):
**Supabase** — лучший баланс:
- ✅ Бесплатно
- ✅ Простая настройка
- ✅ SQL (удобно для заказов)
- ✅ Real-time (можно обновлять статусы заказов)
- ✅ Встроенная валидация Telegram initData

### Для продакшена:
**Vercel Serverless Functions + Supabase/PostgreSQL**:
- ✅ Масштабируемо
- ✅ Безопасно
- ✅ Быстро

---

## 📋 Чек-лист внедрения

### Шаг 1: Выбрать хранилище
- [ ] Supabase (рекомендуется)
- [ ] Firebase
- [ ] MongoDB Atlas
- [ ] Другое

### Шаг 2: Настроить БД
- [ ] Создать аккаунт
- [ ] Создать таблицу/коллекцию `orders`
- [ ] Настроить переменные окружения в Vercel

### Шаг 3: Создать API endpoints
- [ ] `api/orders.js` — создание заказа (POST)
- [ ] `api/orders.js` — получение заказов (GET)
- [ ] Валидация Telegram initData

### Шаг 4: Обновить фронтенд
- [ ] Раскомментировать код в `checkout.js`
- [ ] Обновить `my-esims.js` для загрузки с сервера
- [ ] Добавить обработку ошибок

### Шаг 5: Тестирование
- [ ] Создать тестовый заказ
- [ ] Проверить сохранение в БД
- [ ] Проверить загрузку в "My eSIMs"

---

## 🔒 Безопасность

**Важно:** Всегда валидируйте Telegram initData на сервере!

```javascript
// api/validate-telegram.js
import crypto from 'crypto';

function validateInitData(initData, botToken) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();
  
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  
  return calculatedHash === hash;
}
```

---

## 💡 Быстрый старт с Supabase

1. Зарегистрируйтесь на [supabase.com](https://supabase.com)
2. Создайте проект
3. Создайте таблицу `orders`:
```sql
CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  telegram_username TEXT,
  user_name TEXT,
  type TEXT,
  name TEXT,
  code TEXT,
  plan_id TEXT,
  plan_type TEXT,
  price TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

4. Добавьте переменные в Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`

5. Создайте `api/orders.js` (см. примеры выше)

---

## ❓ Вопросы?

- Какой вариант выбрать? → **Supabase** для начала
- Нужен ли сервер? → Да, для безопасности и хранения
- Можно ли без БД? → Нет, для продакшена нужна БД

