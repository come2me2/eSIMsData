#!/bin/bash
# Скрипт для получения информации о сервере из логов

SERVER_IP="37.60.228.11"
SERVER_USER="root"
SERVER_PASSWORD="z67FPwBMJlfWg8LVzG5"
REMOTE_DIR="/var/www/esimsdata"

echo "🔍 Получение информации о сервере..."
echo ""

# Функция для выполнения команд на удаленном сервере
run_remote() {
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SERVER_USER@$SERVER_IP" "$@"
}

echo "📋 Информация о сервере:"
echo "   IP: $SERVER_IP"
echo "   Пользователь: $SERVER_USER"
echo "   Путь: $REMOTE_DIR"
echo ""

echo "📊 Статус PM2:"
run_remote "cd $REMOTE_DIR && pm2 status" 2>/dev/null || echo "   ⚠️ PM2 не запущен или недоступен"

echo ""
echo "📝 Последние логи PM2 (out):"
run_remote "tail -n 20 $REMOTE_DIR/logs/pm2-out.log 2>/dev/null || echo '   ⚠️ Логи не найдены'"

echo ""
echo "📝 Последние логи PM2 (error):"
run_remote "tail -n 20 $REMOTE_DIR/logs/pm2-error.log 2>/dev/null || echo '   ⚠️ Логи не найдены'"

echo ""
echo "🌐 Конфигурация Nginx:"
run_remote "grep -E 'server_name|proxy_pass' /etc/nginx/sites-available/esimsdata 2>/dev/null | head -5 || echo '   ⚠️ Конфигурация не найдена'"

echo ""
echo "🔧 Переменные окружения (DOMAIN, PORT):"
run_remote "cd $REMOTE_DIR && grep -E 'DOMAIN|PORT' .env 2>/dev/null || echo '   ⚠️ .env файл не найден или переменные не установлены'"

echo ""
echo "✅ Информация получена"








