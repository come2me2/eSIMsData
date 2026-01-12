#!/bin/bash
# Скрипт для установки webhook на удаленном сервере
# Этот скрипт должен быть запущен НА СЕРВЕРЕ
# Использование на сервере: cd /var/www/esimsdata && bash install-webhook-remote.sh

set -e

REMOTE_DIR="/var/www/esimsdata"
WEBHOOK_URL="https://esimsdata.app"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

cd "$REMOTE_DIR" || exit 1

echo ""
log "🔍 Проверка .env файла..."

if [ ! -f ".env" ]; then
    error ".env файл не найден!"
    exit 1
fi

log ".env файл найден"

# Загружаем переменные окружения
set -a
source .env 2>/dev/null || true
set +a

# Проверяем наличие TELEGRAM_BOT_TOKEN
if [ -z "$TELEGRAM_BOT_TOKEN" ] && [ -z "$BOT_TOKEN" ]; then
    error "TELEGRAM_BOT_TOKEN не найден в .env!"
    exit 1
fi

BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-$BOT_TOKEN}"
log "TELEGRAM_BOT_TOKEN найден: ${BOT_TOKEN:0:10}..."

# Проверяем наличие TELEGRAM_WEBHOOK_SECRET
WEBHOOK_SECRET="${TELEGRAM_WEBHOOK_SECRET:-}"
if [ -n "$WEBHOOK_SECRET" ]; then
    log "TELEGRAM_WEBHOOK_SECRET найден: ${WEBHOOK_SECRET:0:10}..."
else
    warn "TELEGRAM_WEBHOOK_SECRET не установлен (опционально)"
fi

echo ""
log "🔧 Установка webhook..."

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    error "Node.js не найден!"
    exit 1
fi

# Проверяем наличие скрипта setup-bot-webhook.js
if [ ! -f "scripts/setup-bot-webhook.js" ]; then
    error "scripts/setup-bot-webhook.js не найден!"
    exit 1
fi

# Запускаем скрипт установки webhook
log "Запуск скрипта установки webhook..."
node scripts/setup-bot-webhook.js "$WEBHOOK_URL"

echo ""
log "✅ Готово! Webhook должен быть установлен."
echo ""
log "Проверка информации о webhook:"
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | node -e "
const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
if (data.ok) {
    console.log('   URL:', data.result.url || 'не установлен');
    console.log('   Ожидает обновлений:', data.result.pending_update_count || 0);
    if (data.result.last_error_date) {
        console.log('   ⚠️ Последняя ошибка:', data.result.last_error_message);
        console.log('   Дата ошибки:', new Date(data.result.last_error_date * 1000).toISOString());
    } else {
        console.log('   ✅ Нет ошибок');
    }
} else {
    console.log('   ❌ Ошибка:', data.description);
}
"

echo ""
log "🎉 Завершено!"




