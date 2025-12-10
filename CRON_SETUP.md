# Настройка автоматического обновления кэша

Данные тарифов обновляются автоматически 1 раз в сутки через cron job. Пользователи всегда видят актуальные кэшированные данные без ожидания загрузки.

## Вариант 1: Vercel Cron Jobs (рекомендуется, если есть Pro план)

Vercel Cron Jobs доступны на Pro плане и выше. Настройка уже добавлена в `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cache/refresh?secret=YOUR_SECRET&type=all",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Расписание**: `0 2 * * *` означает обновление каждый день в 2:00 UTC.

**Настройка**:
1. Установите переменную окружения `CACHE_REFRESH_SECRET` в Vercel (Settings → Environment Variables)
2. Замените `YOUR_SECRET` в `vercel.json` на тот же секретный ключ
3. Деплойте проект на Vercel

## Вариант 2: Внешний сервис (для Hobby плана)

Если у вас Hobby план Vercel, используйте внешний сервис для cron jobs:

### Использование cron-job.org (бесплатно)

1. Зарегистрируйтесь на https://cron-job.org
2. Создайте новый cron job:
   - **URL**: `https://your-domain.vercel.app/api/cache/refresh?secret=YOUR_SECRET&type=all`
   - **Schedule**: `0 2 * * *` (каждый день в 2:00 UTC)
   - **Method**: GET или POST
3. Установите переменную окружения `CACHE_REFRESH_SECRET` в Vercel
4. Используйте тот же секретный ключ в URL

### Использование EasyCron

1. Зарегистрируйтесь на https://www.easycron.com
2. Создайте новый cron job с аналогичными настройками

### Использование GitHub Actions (бесплатно)

Создайте файл `.github/workflows/refresh-cache.yml`:

```yaml
name: Refresh Cache

on:
  schedule:
    - cron: '0 2 * * *'  # Каждый день в 2:00 UTC
  workflow_dispatch:  # Позволяет запускать вручную

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Refresh Cache
        run: |
          curl -X POST "https://your-domain.vercel.app/api/cache/refresh?secret=${{ secrets.CACHE_REFRESH_SECRET }}&type=all"
```

**Настройка**:
1. Добавьте секрет `CACHE_REFRESH_SECRET` в GitHub (Settings → Secrets → Actions)
2. Замените `your-domain.vercel.app` на ваш домен
3. Установите тот же секретный ключ в Vercel

## Безопасность

⚠️ **Важно**: Обязательно установите сильный секретный ключ в переменной окружения `CACHE_REFRESH_SECRET` в Vercel. Это защитит endpoint от несанкционированного доступа.

## Проверка работы

После настройки cron job, проверьте логи Vercel в разделе Functions. Вы должны видеть логи обновления кэша каждый день в указанное время.

Также можно запустить обновление вручную:
```bash
curl -X POST "https://your-domain.vercel.app/api/cache/refresh?secret=YOUR_SECRET&type=all"
```

## TTL кэша

TTL (время жизни) кэша установлено на 24 часа. Это означает:
- Данные кэшируются на 24 часа
- Пользователи видят кэшированные данные мгновенно
- Обновление происходит в фоне через cron job
- Если cron job не сработал, данные все равно будут обновлены при следующем запросе (но это займет время)

