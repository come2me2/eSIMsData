# Настройка автоматического обновления кэша на Contabo VPS

Данные тарифов обновляются автоматически 1 раз в сутки через cron job на сервере Contabo. Пользователи всегда видят актуальные кэшированные данные без ожидания загрузки.

## Шаг 1: Подготовка скриптов

Скрипты уже созданы в проекте:
- `scripts/refresh-cache.sh` - bash скрипт для cron
- `scripts/refresh-cache-direct.js` - Node.js скрипт (fallback)

## Шаг 2: Установка прав на выполнение

Подключитесь к серверу Contabo по SSH и выполните:

```bash
cd /var/www/esimsdata
chmod +x scripts/refresh-cache.sh
```

## Шаг 3: Настройка переменных окружения

Убедитесь, что в `.env` файле установлена переменная `CACHE_REFRESH_SECRET`:

```bash
nano /var/www/esimsdata/.env
```

Добавьте или обновите:
```
CACHE_REFRESH_SECRET=your-strong-secret-key-here
```

**Важно**: Используйте сильный случайный ключ для безопасности!

## Шаг 4: Настройка cron job

Откройте crontab для редактирования:

```bash
crontab -e
```

Добавьте следующую строку для обновления кэша каждый день в 2:00 UTC (или выберите другое время):

```bash
# Обновление кэша тарифов каждый день в 2:00 UTC
0 2 * * * cd /var/www/esimsdata && /bin/bash scripts/refresh-cache.sh >> /var/www/esimsdata/logs/cache-refresh.log 2>&1
```

**Объяснение расписания**:
- `0 2 * * *` - каждый день в 2:00 UTC
- Для другого времени используйте формат: `минута час * * *`
- Например: `0 3 * * *` - каждый день в 3:00 UTC
- Например: `0 2 * * 1` - каждый понедельник в 2:00 UTC

## Шаг 5: Проверка работы

### Проверка cron job вручную

Выполните скрипт вручную для проверки:

```bash
cd /var/www/esimsdata
bash scripts/refresh-cache.sh
```

Проверьте логи:

```bash
tail -f /var/www/esimsdata/logs/cache-refresh.log
```

### Проверка через HTTP endpoint

Если сервер запущен, можно проверить через curl:

```bash
curl -X POST "http://localhost:3000/api/cache/refresh?secret=YOUR_SECRET&type=all"
```

Или с внешнего домена:

```bash
curl -X POST "https://your-domain.com/api/cache/refresh?secret=YOUR_SECRET&type=all"
```

### Проверка списка cron jobs

Просмотрите список активных cron jobs:

```bash
crontab -l
```

## Шаг 6: Мониторинг

Логи обновления кэша сохраняются в:
```
/var/www/esimsdata/logs/cache-refresh.log
```

Просмотр последних записей:
```bash
tail -n 50 /var/www/esimsdata/logs/cache-refresh.log
```

Просмотр логов за сегодня:
```bash
grep "$(date +%Y-%m-%d)" /var/www/esimsdata/logs/cache-refresh.log
```

## Альтернативные варианты расписания

### Обновление каждые 12 часов
```bash
0 */12 * * * cd /var/www/esimsdata && /bin/bash scripts/refresh-cache.sh >> /var/www/esimsdata/logs/cache-refresh.log 2>&1
```

### Обновление каждый час (для тестирования)
```bash
0 * * * * cd /var/www/esimsdata && /bin/bash scripts/refresh-cache.sh >> /var/www/esimsdata/logs/cache-refresh.log 2>&1
```

### Обновление в определенное время по московскому времени (UTC+3)
Для обновления в 2:00 по Москве (23:00 UTC предыдущего дня):
```bash
0 23 * * * cd /var/www/esimsdata && /bin/bash scripts/refresh-cache.sh >> /var/www/esimsdata/logs/cache-refresh.log 2>&1
```

## Устранение проблем

### Скрипт не выполняется

1. Проверьте права на выполнение:
   ```bash
   ls -l scripts/refresh-cache.sh
   ```
   Должно быть: `-rwxr-xr-x`

2. Проверьте путь к Node.js:
   ```bash
   which node
   ```

3. Проверьте переменные окружения:
   ```bash
   echo $CACHE_REFRESH_SECRET
   ```

### Ошибки в логах

Проверьте логи PM2 для ошибок приложения:
```bash
pm2 logs
```

Проверьте логи cron:
```bash
grep CRON /var/log/syslog
```

### Кэш не обновляется

1. Убедитесь, что сервер запущен:
   ```bash
   pm2 status
   ```

2. Проверьте, что endpoint доступен:
   ```bash
   curl http://localhost:3000/api/cache/refresh?secret=YOUR_SECRET&type=all
   ```

3. Если HTTP endpoint недоступен, скрипт автоматически попробует прямой вызов через Node.js

## Безопасность

⚠️ **Важно**: 
- Никогда не коммитьте `CACHE_REFRESH_SECRET` в Git
- Используйте сильный случайный ключ
- Ограничьте доступ к файлу `.env` (права 600):
  ```bash
  chmod 600 /var/www/esimsdata/.env
  ```

## TTL кэша

TTL (время жизни) кэша установлено на 24 часа. Это означает:
- Данные кэшируются на 24 часа
- Пользователи видят кэшированные данные мгновенно
- Обновление происходит в фоне через cron job
- Если cron job не сработал, данные все равно будут обновлены при следующем запросе (но это займет время)

