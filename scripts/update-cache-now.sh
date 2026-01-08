#!/bin/bash

# Скрипт для обновления кэша тарифов (Region, Local, Global)
# Использование: ./scripts/update-cache-now.sh [server-url] [secret]
# Пример: ./scripts/update-cache-now.sh http://localhost:3000 change-me-in-production

set -e

# Параметры
SERVER_URL="${1:-${DOMAIN:-http://localhost:3000}}"
SECRET="${2:-${CACHE_REFRESH_SECRET:-change-me-in-production}}"

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функция логирования
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

log "🚀 Начинаем обновление кэша тарифов..."
log "📍 Сервер: $SERVER_URL"
log "🔑 Секрет: ${SECRET:0:10}..."

# Шаг 1: Очистка кэша
log "\n📤 Шаг 1/2: Очистка старого кэша..."
REFRESH_URL="${SERVER_URL}/api/cache/refresh?secret=${SECRET}&type=all"

HTTP_CODE=$(curl -s -o /tmp/refresh-response.json -w "%{http_code}" -X POST "$REFRESH_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    log "✅ Кэш успешно очищен"
    cat /tmp/refresh-response.json | python3 -m json.tool 2>/dev/null || cat /tmp/refresh-response.json
    echo ""
else
    error "Очистка кэша вернула код: $HTTP_CODE"
    cat /tmp/refresh-response.json 2>/dev/null || echo "Нет ответа от сервера"
    exit 1
fi

# Шаг 2: Предзаполнение кэша
log "\n📤 Шаг 2/2: Предзаполнение кэша актуальными данными..."
PREFILL_URL="${SERVER_URL}/api/cache/prefill?secret=${SECRET}"

log "⏳ Это может занять несколько минут..."
HTTP_CODE=$(curl -s -o /tmp/prefill-response.json -w "%{http_code}" -X POST "$PREFILL_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    log "✅ Кэш успешно предзаполнен"
    echo ""
    cat /tmp/prefill-response.json | python3 -m json.tool 2>/dev/null || cat /tmp/prefill-response.json
    echo ""
    
    # Извлекаем статистику из ответа
    if command -v python3 &> /dev/null; then
        COUNTRIES=$(cat /tmp/prefill-response.json | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('results', {}).get('countries', {}).get('count', 0))" 2>/dev/null || echo "?")
        GLOBAL_STD=$(cat /tmp/prefill-response.json | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('results', {}).get('global', {}).get('standard', 0))" 2>/dev/null || echo "?")
        GLOBAL_UNL=$(cat /tmp/prefill-response.json | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('results', {}).get('global', {}).get('unlimited', 0))" 2>/dev/null || echo "?")
        REGIONS_SUCCESS=$(cat /tmp/prefill-response.json | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('results', {}).get('regions', {}).get('success', 0))" 2>/dev/null || echo "?")
        LOCAL_SUCCESS=$(cat /tmp/prefill-response.json | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('results', {}).get('local', {}).get('success', 0))" 2>/dev/null || echo "?")
        
        log "\n📊 Статистика обновления:"
        log "   🌍 Countries: $COUNTRIES"
        log "   🌐 Global: $GLOBAL_STD standard, $GLOBAL_UNL unlimited"
        log "   🗺️  Regions: $REGIONS_SUCCESS/8"
        log "   📍 Local: $LOCAL_SUCCESS стран"
    fi
    
    log "\n🎉 Кэш успешно обновлен! Клиенты в TMA теперь увидят актуальные данные."
else
    error "Предзаполнение кэша вернуло код: $HTTP_CODE"
    cat /tmp/prefill-response.json 2>/dev/null || echo "Нет ответа от сервера"
    exit 1
fi

# Очистка временных файлов
rm -f /tmp/refresh-response.json /tmp/prefill-response.json

log "\n✅ Обновление кэша завершено успешно!"

