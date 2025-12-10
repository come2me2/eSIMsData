# ⚡ Быстрая установка на VPS Contabo

## Автоматическая установка одной командой

Скопируйте и выполните на вашем VPS:

```bash
bash <(curl -s https://raw.githubusercontent.com/come2me2/eSIMsData/main/install.sh)
```

Или если curl недоступен:

```bash
wget -O - https://raw.githubusercontent.com/come2me2/eSIMsData/main/install.sh | bash
```

## Что делает скрипт:

1. ✅ Обновляет систему
2. ✅ Устанавливает Node.js 18.x
3. ✅ Устанавливает PM2
4. ✅ Устанавливает Nginx
5. ✅ Устанавливает Certbot
6. ✅ Клонирует проект из GitHub
7. ✅ Устанавливает зависимости
8. ✅ Настраивает переменные окружения
9. ✅ Настраивает Nginx
10. ✅ Запускает Node.js сервер через PM2
11. ✅ Настраивает SSL сертификат (опционально)

## Что нужно подготовить:

1. **Домен** с настроенными DNS записями:
   - A запись: `@` → IP вашего VPS
   - A запись: `www` → IP вашего VPS

2. **ESIMGO_API_KEY** от eSIM Go

## Процесс установки:

Скрипт попросит вас ввести:
- Домен (например: `example.com`)
- ESIMGO_API_KEY (можно пропустить и добавить позже)

После этого установка пройдет автоматически.

## Ручная установка

Если автоматическая установка не подходит, следуйте инструкциям в `DEPLOY_CONTABO.md`.

## После установки:

1. Проверьте работу:
   ```bash
   pm2 status
   curl https://your-domain.com/api/esimgo/countries
   ```

2. Настройте Telegram Bot:
   - URL: `https://your-domain.com`

3. Если не указали API ключ при установке:
   ```bash
   nano /var/www/esimsdata/.env
   # Добавьте: ESIMGO_API_KEY=your_key_here
   pm2 restart esimsdata
   ```

## Обновление проекта:

```bash
cd /var/www/esimsdata
./update.sh
```

## Troubleshooting:

### Проверка статуса:
```bash
pm2 status
pm2 logs esimsdata
systemctl status nginx
```

### Перезапуск сервисов:
```bash
pm2 restart esimsdata
systemctl restart nginx
```

### Проверка портов:
```bash
netstat -tlnp | grep 3000
```

