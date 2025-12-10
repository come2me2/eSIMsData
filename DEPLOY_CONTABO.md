# 🚀 Быстрая инструкция по развертыванию на Contabo VPS

## Предварительные требования

- VPS на Contabo с Ubuntu 22.04 LTS
- Доменное имя с настроенными DNS записями
- SSH доступ к серверу
- ESIMGO_API_KEY от eSIM Go

## Быстрый старт (скопируйте и выполните на сервере)

```bash
# 1. Обновление системы
apt update && apt upgrade -y

# 2. Установка Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
npm install -g pm2

# 3. Установка Nginx
apt install nginx -y
systemctl start nginx
systemctl enable nginx

# 4. Установка Certbot для SSL
apt install certbot python3-certbot-nginx -y

# 5. Создание директории проекта
mkdir -p /var/www/esimsdata
cd /var/www/esimsdata

# 6. Клонирование репозитория (замените на ваш репозиторий)
git clone https://github.com/come2me2/eSIMsData.git .

# 7. Установка зависимостей
npm install --production

# 8. Настройка переменных окружения
cp .env.example .env
nano .env  # Добавьте ESIMGO_API_KEY

# 9. Настройка прав
chown -R www-data:www-data /var/www/esimsdata
chmod 600 .env

# 10. Создание директории для логов
mkdir -p logs

# 11. Запуск Node.js сервера
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 12. Настройка Nginx
# Скопируйте nginx.conf в /etc/nginx/sites-available/esimsdata
# Замените your-domain.com на ваш домен
nano /etc/nginx/sites-available/esimsdata
# Вставьте содержимое из nginx.conf

# 13. Активация конфигурации Nginx
ln -s /etc/nginx/sites-available/esimsdata /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# 14. Получение SSL сертификата
certbot --nginx -d your-domain.com -d www.your-domain.com

# 15. Проверка работы
pm2 status
curl http://localhost:3000/api/esimgo/countries
```

## Проверка работы

1. **Проверьте PM2:**
   ```bash
   pm2 status
   pm2 logs esimsdata
   ```

2. **Проверьте Nginx:**
   ```bash
   systemctl status nginx
   nginx -t
   ```

3. **Проверьте в браузере:**
   - Откройте: `https://your-domain.com`
   - Проверьте API: `https://your-domain.com/api/esimgo/countries`

## Полезные команды

```bash
# Перезапуск сервера
pm2 restart esimsdata

# Просмотр логов
pm2 logs esimsdata --lines 50

# Мониторинг
pm2 monit

# Обновление проекта
cd /var/www/esimsdata
git pull
npm install --production
pm2 restart esimsdata

# Проверка портов
netstat -tlnp | grep 3000
```

## Troubleshooting

### 502 Bad Gateway
```bash
# Проверьте, что Node.js сервер запущен
pm2 status
pm2 restart esimsdata

# Проверьте порт
netstat -tlnp | grep 3000
```

### API не работает
```bash
# Проверьте .env файл
cat /var/www/esimsdata/.env

# Проверьте логи
pm2 logs esimsdata
```

### SSL не работает
```bash
# Обновите сертификат
certbot renew
systemctl reload nginx
```

## Структура проекта на сервере

```
/var/www/esimsdata/
├── api/              # API endpoints
├── public/            # Статические файлы
├── server.js          # Express сервер
├── ecosystem.config.js # PM2 конфигурация
├── package.json       # Зависимости
├── .env              # Переменные окружения
└── logs/             # Логи PM2
```

## Безопасность

1. **Firewall:**
   ```bash
   ufw allow 22/tcp
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```

2. **Права доступа:**
   ```bash
   chmod 600 .env
   chown www-data:www-data .env
   ```

3. **Регулярные обновления:**
   ```bash
   apt install unattended-upgrades -y
   ```

## Поддержка

При возникновении проблем проверьте:
- Логи PM2: `pm2 logs esimsdata`
- Логи Nginx: `/var/log/nginx/esimsdata-error.log`
- Статус сервисов: `pm2 status` и `systemctl status nginx`

