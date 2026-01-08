#!/bin/bash

# Скрипт для обновления кода и кэша на Contabo сервере
# Использование: ./scripts/update-contabo.sh

set -e

# Параметры сервера
SERVER_IP="37.60.228.11"
SERVER_USER="root"
SERVER_PASSWORD="z67FPwBMJlfWg8LVzG5"
REMOTE_DIR="/var/www/esimsdata"

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция логирования
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR:${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO:${NC} $1"
}

# Функция для выполнения команд на удаленном сервере
run_remote() {
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SERVER_USER@$SERVER_IP" "$@"
}

# Проверка наличия sshpass
if ! command -v sshpass &> /dev/null; then
    error "sshpass не установлен. Установите: brew install sshpass (macOS) или apt-get install sshpass (Linux)"
    exit 1
fi

log "🚀 Начинаем обновление на Contabo сервере..."
log "📍 Сервер: $SERVER_IP"
log "📁 Директория: $REMOTE_DIR"
echo ""

# Шаг 1: Обновление кода из git
log "📥 Шаг 1/3: Обновление кода из git репозитория..."
run_remote "cd $REMOTE_DIR && git pull origin main" || {
    error "Не удалось обновить код из git"
    exit 1
}
log "✅ Код успешно обновлен"
echo ""

# Шаг 2: Очистка кэша
log "🔄 Шаг 2/3: Очистка старого кэша..."
run_remote "cd $REMOTE_DIR && node scripts/refresh-cache-direct.js" || {
    warn "Очистка кэша через скрипт не удалась, пробуем через API..."
    
    # Пробуем через API endpoint
    SECRET=$(run_remote "cd $REMOTE_DIR && grep CACHE_REFRESH_SECRET .env 2>/dev/null | cut -d '=' -f2 | tr -d '\"'" || echo "change-me-in-production")
    DOMAIN=$(run_remote "cd $REMOTE_DIR && grep DOMAIN .env 2>/dev/null | cut -d '=' -f2 | tr -d '\"'" || echo "localhost:3000")
    PROTOCOL=$(run_remote "cd $REMOTE_DIR && grep PROTOCOL .env 2>/dev/null | cut -d '=' -f2 | tr -d '\"'" || echo "http")
    
    if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "localhost:3000" ]; then
        warn "DOMAIN не установлен, используем localhost:3000"
        DOMAIN="localhost:3000"
        PROTOCOL="http"
    fi
    
    log "Используем: $PROTOCOL://$DOMAIN"
    run_remote "curl -s -X POST \"$PROTOCOL://$DOMAIN/api/cache/refresh?secret=$SECRET&type=all\"" || {
        error "Не удалось очистить кэш через API"
        exit 1
    }
}
log "✅ Кэш очищен"
echo ""

# Шаг 3: Предзаполнение кэша
log "📦 Шаг 3/3: Предзаполнение кэша актуальными данными..."
log "⏳ Это может занять несколько минут..."

# Пробуем через скрипт prefill-cache.js
run_remote "cd $REMOTE_DIR && npm run prefill-cache" || {
    warn "Предзаполнение через npm скрипт не удалось, пробуем через API..."
    
    # Пробуем через API endpoint
    SECRET=$(run_remote "cd $REMOTE_DIR && grep CACHE_REFRESH_SECRET .env 2>/dev/null | cut -d '=' -f2 | tr -d '\"'" || echo "change-me-in-production")
    DOMAIN=$(run_remote "cd $REMOTE_DIR && grep DOMAIN .env 2>/dev/null | cut -d '=' -f2 | tr -d '\"'" || echo "localhost:3000")
    PROTOCOL=$(run_remote "cd $REMOTE_DIR && grep PROTOCOL .env 2>/dev/null | cut -d '=' -f2 | tr -d '\"'" || echo "http")
    
    if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "localhost:3000" ]; then
        warn "DOMAIN не установлен, используем localhost:3000"
        DOMAIN="localhost:3000"
        PROTOCOL="http"
    fi
    
    log "Используем: $PROTOCOL://$DOMAIN"
    RESPONSE=$(run_remote "curl -s -X POST \"$PROTOCOL://$DOMAIN/api/cache/prefill?secret=$SECRET\"")
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        log "✅ Кэш успешно предзаполнен"
        
        # Парсим статистику из ответа (если есть python3)
        if command -v python3 &> /dev/null; then
            echo "$RESPONSE" | python3 -m json.tool 2>/dev/null | grep -E "countries|global|regions|local" || echo "$RESPONSE"
        else
            echo "$RESPONSE"
        fi
    else
        error "Не удалось предзаполнить кэш"
        echo "$RESPONSE"
        exit 1
    fi
}

log ""
log "🎉 Обновление завершено успешно!"
log "✅ Код обновлен из git"
log "✅ Кэш очищен и предзаполнен актуальными данными"
log ""
log "💡 Клиенты в TMA теперь увидят актуальные данные моментально"

