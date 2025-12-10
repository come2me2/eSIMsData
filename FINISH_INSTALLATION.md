# 🚀 Завершение установки на VPS Contabo

## Текущий статус:
- ✅ Система обновлена
- ✅ Node.js установлен
- ✅ PM2 установлен
- ✅ Nginx установлен
- ✅ Certbot установлен
- ✅ Репозиторий склонирован в `/var/www/esimsdata`

## Шаг 1: Установка зависимостей Node.js

```bash
cd /var/www/esimsdata
npm install --production
```

Дождитесь завершения установки.

## Шаг 2: Настройка переменных окружения

```bash
# Создайте файл .env из примера
cp .env.example .env

# Откройте файл для редактирования
nano .env
```

В файле `.env` добавьте ваш `ESIMGO_API_KEY`:

```
ESIMGO_API_KEY=your_actual_api_key_here
PORT=3000
NODE_ENV=production
```

**Как редактировать в nano:**
- Введите ваш `ESIMGO_API_KEY` вместо `your_actual_api_key_here`
- Сохраните: `Ctrl+O`, затем `Enter`
- Выйдите: `Ctrl+X`

## Шаг 3: Настройка прав доступа

```bash
# Установите правильные права на файлы и директории
chown -R www-data:www-data /var/www/esimsdata
chmod 600 /var/www/esimsdata/.env
chmod +x /var/www/esimsdata/update.sh

# Создайте директорию для логов
mkdir -p /var/www/esimsdata/logs
chown -R www-data:www-data /var/www/esimsdata/logs
```

## Шаг 4: Запуск Node.js сервера через PM2

```bash
# Убедитесь, что вы в директории проекта
cd /var/www/esimsdata

# Запустите сервер
pm2 start ecosystem.config.js

# Сохраните конфигурацию PM2
pm2 save

# Настройте автозапуск при перезагрузке сервера
pm2 startup
```

**Важно:** После команды `pm2 startup` скопируйте и выполните команду, которую покажет PM2 (обычно что-то вроде `sudo env PATH=... pm2 startup systemd -u root --hp /root`).

## Шаг 5: Проверка работы сервера

```bash
# Проверьте статус
pm2 status

# Посмотрите логи
pm2 logs esimsdata

# Проверьте, что сервер слушает на порту 3000
netstat -tlnp | grep 3000
# или
ss -tlnp | grep 3000
```

Должно быть видно, что процесс Node.js работает и слушает порт 3000.

## Шаг 6: Настройка Nginx

### 6.1. Узнайте ваш домен

У вас должен быть домен, который указывает на IP сервера `37.60.228.11`.

**Настройте DNS записи:**
- A запись: `@` → `37.60.228.11`
- A запись: `www` → `37.60.228.11`

Подождите 5-30 минут для распространения DNS.

### 6.2. Создайте конфигурацию Nginx

Замените `your-domain.com` на ваш реальный домен:

```bash
# Создайте конфигурацию Nginx
nano /etc/nginx/sites-available/esimsdata
```

Вставьте следующую конфигурацию (замените `your-domain.com` на ваш домен):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration (будет настроен Certbot)
    # ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Root directory
    root /var/www/esimsdata/public;
    index index.html;
    
    # Logging
    access_log /var/log/nginx/esimsdata-access.log;
    error_log /var/log/nginx/esimsdata-error.log;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json application/xml image/svg+xml;
    
    # API endpoints - проксируем на Node.js сервер
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Cache HTML files
    location ~* \.html$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }
    
    # Main location - проксируем на Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

**Сохраните:** `Ctrl+O`, `Enter`, `Ctrl+X`

### 6.3. Активируйте конфигурацию

```bash
# Создайте символическую ссылку
ln -sf /etc/nginx/sites-available/esimsdata /etc/nginx/sites-enabled/

# Удалите дефолтную конфигурацию (если есть)
rm -f /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
nginx -t
```

Если проверка прошла успешно, перезагрузите Nginx:

```bash
systemctl reload nginx
```

## Шаг 7: Получение SSL сертификата

**Важно:** Убедитесь, что DNS записи для вашего домена уже указывают на IP сервера и прошло хотя бы 5-10 минут.

```bash
# Получите SSL сертификат
certbot --nginx -d your-domain.com -d www.your-domain.com
```

Замените `your-domain.com` на ваш реальный домен.

Certbot спросит:
- Email адрес (для уведомлений) - введите ваш email
- Согласие с условиями - введите `A` (Agree)
- Поделиться email - введите `Y` или `N` (по желанию)

После этого Certbot автоматически:
- Получит SSL сертификат
- Обновит конфигурацию Nginx
- Настроит автоматическое обновление

## Шаг 8: Финальная проверка

### 8.1. Проверьте работу сайта

Откройте в браузере:
- `https://your-domain.com`
- `https://your-domain.com/api/esimgo/countries`

### 8.2. Проверьте статус сервисов

```bash
# Статус PM2
pm2 status

# Статус Nginx
systemctl status nginx

# Логи Node.js
pm2 logs esimsdata --lines 50

# Логи Nginx
tail -f /var/log/nginx/esimsdata-access.log
tail -f /var/log/nginx/esimsdata-error.log
```

## Шаг 9: Настройка Telegram Bot

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newapp` (если бот уже создан) или создайте нового бота через `/newbot`
3. Выберите вашего бота
4. Укажите:
   - **Title**: `eSIMsData`
   - **Description**: `Global eSIM for your Travel`
   - **Web App URL**: `https://your-domain.com`

## Полезные команды

### Управление PM2

```bash
# Перезапуск сервера
pm2 restart esimsdata

# Остановка сервера
pm2 stop esimsdata

# Просмотр логов
pm2 logs esimsdata

# Мониторинг
pm2 monit

# Список процессов
pm2 list
```

### Управление Nginx

```bash
# Перезапуск
systemctl restart nginx

# Перезагрузка конфигурации
systemctl reload nginx

# Проверка конфигурации
nginx -t

# Статус
systemctl status nginx
```

### Обновление проекта

```bash
cd /var/www/esimsdata
./update.sh
```

Или вручную:

```bash
cd /var/www/esimsdata
git pull
npm install --production
pm2 restart esimsdata
systemctl reload nginx
```

## Troubleshooting

### Проблема: PM2 не запускается

```bash
# Проверьте логи
pm2 logs esimsdata

# Проверьте .env файл
cat /var/www/esimsdata/.env

# Проверьте, что все зависимости установлены
cd /var/www/esimsdata
npm list --depth=0
```

### Проблема: 502 Bad Gateway

```bash
# Проверьте, что Node.js сервер работает
pm2 status
netstat -tlnp | grep 3000

# Проверьте логи Nginx
tail -f /var/log/nginx/esimsdata-error.log

# Перезапустите сервер
pm2 restart esimsdata
```

### Проблема: SSL сертификат не работает

```bash
# Проверьте DNS
nslookup your-domain.com

# Обновите сертификат вручную
certbot renew

# Проверьте конфигурацию Nginx
nginx -t
```

### Проблема: API не отвечает

```bash
# Проверьте .env файл
cat /var/www/esimsdata/.env | grep ESIMGO_API_KEY

# Проверьте логи
pm2 logs esimsdata

# Проверьте, что API ключ правильный
curl http://localhost:3000/api/esimgo/countries
```

## Готово! 🎉

Ваш проект должен быть доступен по адресу `https://your-domain.com`

Если возникли проблемы, проверьте логи и статус сервисов командами выше.

