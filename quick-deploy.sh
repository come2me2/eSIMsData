#!/bin/bash
# Быстрый деплой на Contabo VPS без интерактивных запросов
# Использование: ./quick-deploy.sh

SERVER_IP="37.60.228.11"
SERVER_USER="root"
SERVER_PASSWORD="z67FPwBMJlfWg8LVzG5"
REMOTE_DIR="/var/www/esimsdata"

echo "🚀 Быстрый деплой на Contabo..."

# Коммит локальных изменений если есть
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Коммит локальных изменений..."
    git add -A
    git commit -m "Auto deploy: $(date '+%Y-%m-%d %H:%M:%S')" 2>/dev/null || true
    git push origin main 2>/dev/null || true
fi

# Git pull на сервере, установка зависимостей и перезапуск PM2
echo "📥 Обновление сервера..."
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o LogLevel=ERROR "$SERVER_USER@$SERVER_IP" \
    "cd $REMOTE_DIR && git fetch origin && git reset --hard origin/main && npm install --production && pm2 restart all" 2>/dev/null

echo "✅ Готово!"

