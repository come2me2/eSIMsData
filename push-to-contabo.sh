#!/bin/bash
# Скрипт для пуша изменений на Contabo VPS
# Использование: ./push-to-contabo.sh

set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Данные сервера
SERVER_IP="${SERVER_IP:-37.60.228.11}"
SERVER_USER="${SERVER_USER:-root}"
SERVER_PASSWORD="${SERVER_PASSWORD:-z67FPwBMJlfWg8LVzG5}"
REMOTE_DIR="/var/www/esimsdata"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 Деплой на Contabo VPS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Проверка наличия sshpass
if ! command -v sshpass &> /dev/null; then
    echo -e "${RED}❌ sshpass не установлен${NC}"
    echo -e "${YELLOW}Установите: brew install hudochenkov/sshpass/sshpass${NC}"
    exit 1
fi

# Функция для выполнения команд на удаленном сервере
run_remote() {
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SERVER_USER@$SERVER_IP" "$@"
}

# Функция для копирования файлов
copy_to_remote() {
    sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -r "$1" "$SERVER_USER@$SERVER_IP:$2"
}

# Шаг 1: Проверка подключения
echo -e "${YELLOW}📡 Шаг 1/4: Проверка подключения к серверу...${NC}"
if ! run_remote "echo 'Connection test successful'"; then
    echo -e "${RED}❌ Не удалось подключиться к серверу${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Подключение установлено${NC}"
echo ""

# Шаг 2: Проверка git статуса
echo -e "${YELLOW}📋 Шаг 2/4: Проверка изменений в git...${NC}"
GIT_STATUS=$(git status --porcelain)
if [ -n "$GIT_STATUS" ]; then
    echo -e "${YELLOW}⚠️  Обнаружены незакоммиченные изменения:${NC}"
    echo "$GIT_STATUS"
    echo ""
    read -p "Закоммитить и запушить изменения? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}📝 Добавляю все изменения...${NC}"
        git add -A
        
        echo -e "${BLUE}💬 Введите сообщение коммита (или нажмите Enter для автосообщения):${NC}"
        read -r COMMIT_MSG
        if [ -z "$COMMIT_MSG" ]; then
            COMMIT_MSG="Update: $(date '+%Y-%m-%d %H:%M:%S')"
        fi
        
        echo -e "${BLUE}💾 Создаю коммит...${NC}"
        git commit -m "$COMMIT_MSG"
        
        echo -e "${BLUE}📤 Пушим в репозиторий...${NC}"
        git push origin main
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Изменения успешно запушены в git${NC}"
        else
            echo -e "${RED}❌ Ошибка при пуше в git${NC}"
            read -p "Продолжить деплой без git push? (y/n): " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  Пропускаю git commit/push${NC}"
    fi
else
    echo -e "${GREEN}✅ Нет незакоммиченных изменений${NC}"
fi
echo ""

# Шаг 3: Обновление на сервере
echo -e "${YELLOW}🔄 Шаг 3/4: Обновление кода на сервере...${NC}"
echo -e "${BLUE}📥 Выполняю git pull на сервере...${NC}"

run_remote "cd $REMOTE_DIR && git pull origin main" || {
    echo -e "${RED}❌ Ошибка при git pull на сервере${NC}"
    echo -e "${YELLOW}⚠️  Пробую альтернативный метод через SCP...${NC}"
    
    # Альтернативный метод: копирование через SCP
    echo -e "${BLUE}📦 Создаю архив проекта...${NC}"
    cd "$(dirname "$0")"
    tar --exclude='.git' \
        --exclude='node_modules' \
        --exclude='.DS_Store' \
        --exclude='*.log' \
        --exclude='logs' \
        --exclude='.env' \
        -czf /tmp/esimsdata_deploy.tar.gz .
    
    echo -e "${BLUE}📤 Загружаю на сервер...${NC}"
    sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no \
        /tmp/esimsdata_deploy.tar.gz \
        "$SERVER_USER@$SERVER_IP:/tmp/"
    
    echo -e "${BLUE}📥 Распаковываю на сервере...${NC}"
    run_remote "cd $REMOTE_DIR && tar -xzf /tmp/esimsdata_deploy.tar.gz && rm /tmp/esimsdata_deploy.tar.gz"
    
    rm /tmp/esimsdata_deploy.tar.gz
}

echo -e "${GREEN}✅ Код обновлен на сервере${NC}"
echo ""

# Шаг 4: Установка зависимостей и перезапуск
echo -e "${YELLOW}📦 Шаг 4/4: Установка зависимостей и перезапуск...${NC}"

echo -e "${BLUE}📥 Устанавливаю зависимости...${NC}"
run_remote "cd $REMOTE_DIR && npm install --production" || {
    echo -e "${YELLOW}⚠️  Ошибка при установке зависимостей, продолжаю...${NC}"
}

echo -e "${BLUE}🔄 Перезапускаю PM2...${NC}"
run_remote "cd $REMOTE_DIR && pm2 restart all || pm2 restart esimsdata || true"

echo -e "${BLUE}📊 Проверяю статус PM2...${NC}"
run_remote "pm2 status"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Деплой завершен успешно!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}📝 Для проверки подключитесь к серверу:${NC}"
echo -e "   ssh $SERVER_USER@$SERVER_IP"
echo -e "   cd $REMOTE_DIR"
echo -e "   pm2 logs"
echo ""

