#!/bin/bash
# Скрипт для автоматического развертывания на VPS Contabo
# Использование: ./deploy-to-server.sh

set -e

SERVER_IP="37.60.228.11"
SERVER_USER="root"
SERVER_PASSWORD="z67FPwBMJlfWg8LVzG5"

echo "🚀 Подключение к серверу $SERVER_IP..."

# Функция для выполнения команд на удаленном сервере
run_remote() {
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SERVER_USER@$SERVER_IP" "$@"
}

# Функция для копирования файлов
copy_to_remote() {
    sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$1" "$SERVER_USER@$SERVER_IP:$2"
}

echo "📦 Шаг 1: Проверка подключения..."
if ! run_remote "echo 'Connection test successful'"; then
    echo "❌ Не удалось подключиться к серверу"
    echo "Установите sshpass: brew install hudochenkov/sshpass/sshpass"
    exit 1
fi

echo ""
echo "📦 Шаг 2: Обновление системы..."
run_remote "apt update && apt upgrade -y"

echo ""
echo "📦 Шаг 3: Установка Node.js 18.x..."
run_remote "curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt install -y nodejs"

echo ""
echo "📦 Шаг 4: Установка PM2..."
run_remote "npm install -g pm2"

echo ""
echo "📦 Шаг 5: Установка Nginx..."
run_remote "apt install nginx -y && systemctl start nginx && systemctl enable nginx"

echo ""
echo "📦 Шаг 6: Установка Certbot..."
run_remote "apt install certbot python3-certbot-nginx -y"

echo ""
echo "📦 Шаг 7: Клонирование проекта..."
run_remote "mkdir -p /var/www/esimsdata && cd /var/www/esimsdata && git clone https://github.com/come2me2/eSIMsData.git . || (cd /var/www/esimsdata && git pull)"

echo ""
echo "📦 Шаг 8: Установка зависимостей..."
run_remote "cd /var/www/esimsdata && npm install --production"

echo ""
echo "📦 Шаг 9: Настройка переменных окружения..."
run_remote "cd /var/www/esimsdata && cp .env.example .env || true"

echo ""
echo "📦 Шаг 10: Настройка прав доступа..."
run_remote "chown -R www-data:www-data /var/www/esimsdata && chmod 600 /var/www/esimsdata/.env && chmod +x /var/www/esimsdata/update.sh"

echo ""
echo "📦 Шаг 11: Создание директории для логов..."
run_remote "mkdir -p /var/www/esimsdata/logs && chown -R www-data:www-data /var/www/esimsdata/logs"

echo ""
echo "📦 Шаг 12: Запуск Node.js сервера через PM2..."
run_remote "cd /var/www/esimsdata && pm2 delete esimsdata 2>/dev/null || true && pm2 start ecosystem.config.js && pm2 save && pm2 startup systemd -u root --hp /root || true"

echo ""
echo "✅ Установка завершена!"
echo ""
echo "📝 Следующие шаги:"
echo "1. Настройте DNS записи для вашего домена"
echo "2. Добавьте ESIMGO_API_KEY в /var/www/esimsdata/.env на сервере"
echo "3. Настройте Nginx конфигурацию с вашим доменом"
echo "4. Получите SSL сертификат: certbot --nginx -d your-domain.com"
echo ""
echo "Для подключения к серверу:"
echo "ssh root@$SERVER_IP"

