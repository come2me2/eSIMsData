#!/bin/bash
# Скрипт для загрузки проекта на сервер через SCP
# Использование: ./deploy-via-scp.sh

SERVER_IP="37.60.228.11"
SERVER_USER="root"
SERVER_PASSWORD="z67FPwBMJlfWg8LVzG5"
PROJECT_DIR="/Users/sergeykalinin/Desktop/eSim"
REMOTE_DIR="/var/www/esimsdata"

echo "📦 Создание архива проекта..."

# Создаем временный архив
cd "$PROJECT_DIR"
tar --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.DS_Store' \
    --exclude='*.log' \
    --exclude='logs' \
    -czf /tmp/esimsdata.tar.gz .

echo "📤 Загрузка на сервер..."

# Загружаем архив на сервер
sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no \
    /tmp/esimsdata.tar.gz \
    "$SERVER_USER@$SERVER_IP:/tmp/"

echo "📥 Распаковка на сервере..."

# Распаковываем на сервере
sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no \
    "$SERVER_USER@$SERVER_IP" \
    "mkdir -p $REMOTE_DIR && \
     cd $REMOTE_DIR && \
     tar -xzf /tmp/esimsdata.tar.gz && \
     rm /tmp/esimsdata.tar.gz && \
     chown -R www-data:www-data $REMOTE_DIR"

echo "✅ Файлы загружены!"

# Удаляем временный архив
rm /tmp/esimsdata.tar.gz

echo ""
echo "Теперь подключитесь к серверу и выполните:"
echo "ssh $SERVER_USER@$SERVER_IP"
echo "cd $REMOTE_DIR"
echo "npm install --production"

