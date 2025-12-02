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

## Шаг 3: Установка Nginx

```bash
# Ubuntu/Debian
apt install nginx -y

# CentOS/RHEL
yum install nginx -y

# Запуск и автозагрузка
systemctl start nginx
systemctl enable nginx
```

## Шаг 4: Настройка DNS

Настройте DNS записи для вашего домена:
- **A запись**: `@` → IP адрес вашего VPS
- **A запись**: `www` → IP адрес вашего VPS

Подождите 5-30 минут для распространения DNS.

## Шаг 5: Установка SSL сертификата (Let's Encrypt)

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

## Шаг 6: Настройка Nginx

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

## Шаг 7: Загрузка файлов проекта

### Вариант A: Через Git (рекомендуется)

```bash
# Установка Git
apt install git -y

# Создание директории
mkdir -p /var/www/esimsdata
cd /var/www/esimsdata

# Клонирование репозитория
git clone https://github.com/siamocean/esimsdata-telegram-app.git .

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

## Шаг 8: Настройка прав доступа

```bash
# Установка правильных прав
chown -R www-data:www-data /var/www/esimsdata
chmod -R 755 /var/www/esimsdata
find /var/www/esimsdata -type f -exec chmod 644 {} \;
```

## Шаг 9: Проверка работы

1. Откройте браузер: `https://your-domain.com`
2. Проверьте, что сайт загружается
3. Проверьте SSL: `https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com`

## Шаг 10: Настройка Telegram Bot

В настройках вашего Telegram бота укажите:
- **Web App URL**: `https://your-domain.com`

## Автоматическое обновление (опционально)

Создайте cron задачу для автоматического обновления из Git:

```bash
# Редактирование crontab
crontab -e

# Добавьте строку (обновление каждый день в 3:00)
0 3 * * * cd /var/www/esimsdata && git pull && systemctl reload nginx
```

## Мониторинг и логи

```bash
# Просмотр логов Nginx
tail -f /var/log/nginx/esimsdata-access.log
tail -f /var/log/nginx/esimsdata-error.log

# Статус Nginx
systemctl status nginx

# Перезапуск Nginx
systemctl restart nginx
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
# Проверьте статус Nginx
systemctl status nginx
# Проверьте логи
tail -f /var/log/nginx/error.log
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

## Дополнительные оптимизации

### Установка PHP-FPM (если понадобится в будущем)
```bash
apt install php-fpm php-cli -y
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






