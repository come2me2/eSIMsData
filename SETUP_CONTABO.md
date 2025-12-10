# Инструкция по развертыванию Telegram Mini App на Contabo

## Требования

- VPS на Contabo (любой тариф)
- Доменное имя (обязательно для HTTPS)
- SSH доступ к серверу
- Базовые знания Linux

## Шаг 1: Подключение к серверу

```bash
ssh root@your-server-ip
```

## Шаг 2: Обновление системы

```bash
# Для Ubuntu/Debian
apt update && apt upgrade -y

# Для CentOS/RHEL
yum update -y
```

## Шаг 3: Установка Node.js

```bash
# Ubuntu/Debian - установка Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Проверка версии
node --version  # Должно быть v18.x или выше
npm --version

# Установка PM2 для управления процессом
npm install -g pm2
```

## Шаг 4: Установка Nginx

```bash
# Ubuntu/Debian
apt install nginx -y

# CentOS/RHEL
yum install nginx -y

# Запуск и автозагрузка
systemctl start nginx
systemctl enable nginx
```

## Шаг 5: Настройка DNS

Настройте DNS записи для вашего домена:
- **A запись**: `@` → IP адрес вашего VPS
- **A запись**: `www` → IP адрес вашего VPS

Подождите 5-30 минут для распространения DNS.

## Шаг 6: Установка SSL сертификата (Let's Encrypt)

```bash
# Установка Certbot
apt install certbot python3-certbot-nginx -y
# или для CentOS
yum install certbot python3-certbot-nginx -y

# Получение SSL сертификата
certbot --nginx -d your-domain.com -d www.your-domain.com

# Автоматическое обновление (добавится в cron)
certbot renew --dry-run
```

## Шаг 7: Настройка Nginx

1. Скопируйте файл `nginx.conf` на сервер
2. Замените `your-domain.com` на ваш домен
3. Скопируйте конфигурацию:

```bash
# Создайте конфигурацию
nano /etc/nginx/sites-available/esimsdata

# Вставьте содержимое из nginx.conf (заменив your-domain.com)
# Сохраните (Ctrl+O, Enter, Ctrl+X)

# Создайте символическую ссылку
ln -s /etc/nginx/sites-available/esimsdata /etc/nginx/sites-enabled/

# Удалите дефолтную конфигурацию (опционально)
rm /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
nginx -t

# Перезагрузите nginx
systemctl reload nginx
```

## Шаг 8: Загрузка файлов проекта

### Вариант A: Через Git (рекомендуется)

```bash
# Установка Git (если еще не установлен)
apt install git -y

# Создание директории
mkdir -p /var/www/esimsdata
cd /var/www/esimsdata

# Клонирование репозитория
git clone https://github.com/come2me2/eSIMsData.git .

# Установка зависимостей Node.js
npm install --production

# Установка прав
chown -R www-data:www-data /var/www/esimsdata
chmod -R 755 /var/www/esimsdata
```

### Вариант B: Через SCP (с локального компьютера)

```bash
# На вашем локальном компьютере
scp -r /Users/sergeykalinin/Desktop/eSim/* root@your-server-ip:/var/www/esimsdata/
```

### Вариант C: Через SFTP

Используйте FileZilla или другой SFTP клиент для загрузки файлов.

## Шаг 9: Настройка переменных окружения

```bash
cd /var/www/esimsdata

# Создайте файл .env на основе .env.example
cp .env.example .env

# Отредактируйте .env файл
nano .env

# Добавьте ваш ESIMGO_API_KEY:
# ESIMGO_API_KEY=your_actual_api_key_here
# PORT=3000
# NODE_ENV=production

# Установите правильные права на .env
chmod 600 .env
chown www-data:www-data .env
```

## Шаг 10: Запуск Node.js сервера с PM2

```bash
cd /var/www/esimsdata

# Создайте директорию для логов
mkdir -p logs

# Запустите сервер через PM2
pm2 start ecosystem.config.js

# Сохраните конфигурацию PM2 для автозапуска
pm2 save
pm2 startup

# Проверьте статус
pm2 status
pm2 logs esimsdata

# Полезные команды PM2:
# pm2 restart esimsdata  - перезапуск
# pm2 stop esimsdata      - остановка
# pm2 delete esimsdata    - удаление из PM2
```

## Шаг 11: Настройка прав доступа

```bash
# Установка правильных прав
chown -R www-data:www-data /var/www/esimsdata
chmod -R 755 /var/www/esimsdata
find /var/www/esimsdata -type f -exec chmod 644 {} \;
```

## Шаг 12: Проверка работы

1. Проверьте, что Node.js сервер работает:
```bash
pm2 status
curl http://localhost:3000/api/esimgo/countries
```

2. Откройте браузер: `https://your-domain.com`
3. Проверьте, что сайт загружается
4. Проверьте API: `https://your-domain.com/api/esimgo/countries`
5. Проверьте SSL: `https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com`

## Шаг 13: Настройка Telegram Bot

В настройках вашего Telegram бота укажите:
- **Web App URL**: `https://your-domain.com`

## Автоматическое обновление (опционально)

Создайте cron задачу для автоматического обновления из Git:

```bash
# Редактирование crontab
crontab -e

# Добавьте строку (обновление каждый день в 3:00)
0 3 * * * cd /var/www/esimsdata && git pull && npm install --production && pm2 restart esimsdata && systemctl reload nginx
```

Или создайте скрипт для обновления:

```bash
# Создайте скрипт
nano /var/www/esimsdata/update.sh

# Добавьте содержимое:
#!/bin/bash
cd /var/www/esimsdata
git pull
npm install --production
pm2 restart esimsdata
systemctl reload nginx
echo "Update completed at $(date)"

# Сделайте исполняемым
chmod +x /var/www/esimsdata/update.sh

# Добавьте в cron
0 3 * * * /var/www/esimsdata/update.sh >> /var/log/esimsdata-update.log 2>&1
```

## Мониторинг и логи

```bash
# Просмотр логов Nginx
tail -f /var/log/nginx/esimsdata-access.log
tail -f /var/log/nginx/esimsdata-error.log

# Просмотр логов Node.js (PM2)
pm2 logs esimsdata
pm2 logs esimsdata --lines 100  # последние 100 строк
pm2 monit  # интерактивный мониторинг

# Статус сервисов
systemctl status nginx
pm2 status

# Перезапуск сервисов
systemctl restart nginx
pm2 restart esimsdata

# Просмотр использования ресурсов
pm2 list
htop
```

## Безопасность

### Настройка Firewall (UFW для Ubuntu)

```bash
# Установка UFW
apt install ufw -y

# Разрешить SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Включить firewall
ufw enable
ufw status
```

### Регулярные обновления

```bash
# Автоматические обновления безопасности
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

## Резервное копирование

Создайте скрипт для резервного копирования:

```bash
#!/bin/bash
# backup.sh
tar -czf /var/backups/esimsdata_$(date +%Y%m%d).tar.gz -C /var/www esimsdata
```

Добавьте в cron для ежедневного бэкапа.

## Troubleshooting

### Проблема: 502 Bad Gateway
```bash
# Проверьте статус Node.js сервера
pm2 status
pm2 logs esimsdata

# Проверьте, что сервер слушает на порту 3000
netstat -tlnp | grep 3000
# или
ss -tlnp | grep 3000

# Проверьте статус Nginx
systemctl status nginx
# Проверьте логи
tail -f /var/log/nginx/error.log

# Перезапустите Node.js сервер
pm2 restart esimsdata
```

### Проблема: SSL сертификат не работает
```bash
# Проверьте конфигурацию
nginx -t
# Обновите сертификат
certbot renew
systemctl reload nginx
```

### Проблема: Файлы не загружаются
```bash
# Проверьте права доступа
ls -la /var/www/esimsdata
# Исправьте права
chown -R www-data:www-data /var/www/esimsdata
```

## Рекомендуемые настройки VPS

- **Минимум**: 2 CPU, 4GB RAM, 50GB SSD
- **Рекомендуется**: 4 CPU, 8GB RAM, 100GB SSD
- **ОС**: Ubuntu 22.04 LTS или Debian 11
- **Node.js**: версия 18.x или выше

## Дополнительные оптимизации

### Настройка PM2 для автозапуска при перезагрузке
```bash
# PM2 уже настроен через ecosystem.config.js
# Проверьте автозапуск:
pm2 startup
pm2 save
```

### Оптимизация Node.js
```bash
# Увеличьте лимит памяти для Node.js (если нужно)
# В ecosystem.config.js уже установлен max_memory_restart: '500M'
```

### Мониторинг производительности
```bash
# Установите htop для мониторинга ресурсов
apt install htop -y
htop

# PM2 мониторинг
pm2 monit
```

### Мониторинг ресурсов
```bash
# Установка htop
apt install htop -y
htop
```

## Контакты и поддержка

При возникновении проблем проверьте:
1. Логи Nginx: `/var/log/nginx/error.log`
2. Статус сервисов: `systemctl status nginx`
3. Конфигурацию: `nginx -t`












