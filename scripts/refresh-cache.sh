#!/bin/bash

# Скрипт для обновления кэша на Contabo VPS
# Запускается через cron 1 раз в сутки

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Путь к приложению
APP_DIR="/var/www/esimsdata"
LOG_FILE="/var/www/esimsdata/logs/cache-refresh.log"
SECRET="${CACHE_REFRESH_SECRET:-change-me-in-production}"

# Создаем директорию для логов, если её нет
mkdir -p "$(dirname "$LOG_FILE")"

# Функция для логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "${GREEN}🔄 Starting cache refresh...${NC}"

# Переходим в директорию приложения
cd "$APP_DIR" || {
    log "${RED}❌ Error: Cannot change to directory $APP_DIR${NC}"
    exit 1
}

# Проверяем, что Node.js доступен
if ! command -v node &> /dev/null; then
    log "${RED}❌ Error: Node.js is not installed${NC}"
    exit 1
fi

# Вариант 1: Вызов через HTTP endpoint (если сервер запущен)
# Получаем домен из переменной окружения или используем localhost
DOMAIN="${DOMAIN:-localhost:3000}"
PROTOCOL="${PROTOCOL:-http}"

log "${YELLOW}📡 Calling cache refresh endpoint...${NC}"

# Вызываем endpoint обновления кэша
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "${PROTOCOL}://${DOMAIN}/api/cache/refresh?secret=${SECRET}&type=all" \
    -H "Content-Type: application/json" \
    2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    log "${GREEN}✅ Cache refresh successful${NC}"
    log "Response: $BODY"
    exit 0
else
    log "${RED}❌ Cache refresh failed with HTTP code: $HTTP_CODE${NC}"
    log "Response: $BODY"
    
    # Вариант 2: Прямой вызов через Node.js (fallback)
    log "${YELLOW}🔄 Trying direct Node.js call...${NC}"
    
    if [ -f "scripts/refresh-cache-direct.js" ]; then
        node scripts/refresh-cache-direct.js >> "$LOG_FILE" 2>&1
        if [ $? -eq 0 ]; then
            log "${GREEN}✅ Cache refresh successful (direct call)${NC}"
            exit 0
        else
            log "${RED}❌ Direct cache refresh also failed${NC}"
            exit 1
        fi
    else
        log "${RED}❌ Direct refresh script not found${NC}"
        exit 1
    fi
fi

