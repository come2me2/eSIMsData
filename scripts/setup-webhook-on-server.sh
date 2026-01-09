#!/bin/bash
# Скрипт для проверки .env на сервере и установки webhook
# Использование: ./scripts/setup-webhook-on-server.sh

set -e

SERVER_IP="37.60.228.11"
SERVER_USER="root"
SERVER_PASSWORD="z67FPwBMJlfWg8LVzG5"
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

# Функция для выполнения команд на удаленном сервере
run_remote() {
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$SERVER_USER@$SERVER_IP" "$@"
}

# Проверка наличия sshpass
if ! command -v sshpass &> /dev/null; then
    error "sshpass не установлен. Установите: brew install hudochenkov/sshpass/sshpass (macOS)"
    exit 1
fi

echo ""
log "🔍 Проверка подключения к серверу..."
if ! run_remote "echo 'Connection test successful'" &>/dev/null; then
    error "Не удалось подключиться к серверу"
    exit 1
fi

echo ""
log "📋 Проверка .env файла на сервере..."
echo ""

# Проверяем существование .env файла
if run_remote "test -f $REMOTE_DIR/.env" 2>/dev/null; then
    log ".env файл существует"
    
    # Проверяем наличие TELEGRAM_BOT_TOKEN
    if run_remote "grep -q '^TELEGRAM_BOT_TOKEN=' $REMOTE_DIR/.env 2>/dev/null"; then
        BOT_TOKEN=$(run_remote "grep '^TELEGRAM_BOT_TOKEN=' $REMOTE_DIR/.env | cut -d '=' -f2 | tr -d '\"' | tr -d \"'\"")
        if [ -n "$BOT_TOKEN" ] && [ "$BOT_TOKEN" != "" ]; then
            log "TELEGRAM_BOT_TOKEN найден: ${BOT_TOKEN:0:10}..."
        else
            warn "TELEGRAM_BOT_TOKEN пустой"
        fi
    else
        warn "TELEGRAM_BOT_TOKEN не найден в .env"
    fi
    
    # Проверяем наличие TELEGRAM_WEBHOOK_SECRET
    if run_remote "grep -q '^TELEGRAM_WEBHOOK_SECRET=' $REMOTE_DIR/.env 2>/dev/null"; then
        WEBHOOK_SECRET=$(run_remote "grep '^TELEGRAM_WEBHOOK_SECRET=' $REMOTE_DIR/.env | cut -d '=' -f2 | tr -d '\"' | tr -d \"'\"")
        if [ -n "$WEBHOOK_SECRET" ] && [ "$WEBHOOK_SECRET" != "" ]; then
            log "TELEGRAM_WEBHOOK_SECRET найден: ${WEBHOOK_SECRET:0:10}..."
        else
            warn "TELEGRAM_WEBHOOK_SECRET пустой"
        fi
    else
        warn "TELEGRAM_WEBHOOK_SECRET не найден в .env"
    fi
    
    # Показываем содержимое .env (без чувствительных данных)
    echo ""
    log "Содержимое .env (первые 20 строк, скрыты секреты):"
    run_remote "head -20 $REMOTE_DIR/.env | sed 's/=.*/=***/' | head -10"
    
else
    error ".env файл не найден на сервере!"
    echo ""
    echo "Создать .env файл? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        run_remote "touch $REMOTE_DIR/.env && chmod 600 $REMOTE_DIR/.env"
        log ".env файл создан"
    else
        exit 1
    fi
fi

echo ""
log "🔧 Установка webhook..."

# Проверяем наличие Node.js на сервере
if ! run_remote "command -v node &> /dev/null"; then
    error "Node.js не найден на сервере"
    exit 1
fi

# Копируем скрипт на сервер
log "Копирование скрипта setup-bot-webhook.js на сервер..."
SCRIPT_CONTENT=$(cat scripts/setup-bot-webhook.js)
run_remote "cat > /tmp/setup-bot-webhook.js << 'EOFSCRIPT'
$SCRIPT_CONTENT
EOFSCRIPT
"

# Загружаем переменные окружения на сервере и запускаем скрипт
log "Запуск скрипта установки webhook на сервере..."
run_remote "cd $REMOTE_DIR && source .env 2>/dev/null || true && node /tmp/setup-bot-webhook.js $WEBHOOK_URL"

# Удаляем временный файл
run_remote "rm -f /tmp/setup-bot-webhook.js"

echo ""
log "✅ Готово! Webhook должен быть установлен."
echo ""
log "Проверка информации о webhook:"
run_remote "cd $REMOTE_DIR && source .env 2>/dev/null || true && curl -s \"https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/getWebhookInfo\" | grep -E '(url|pending_update_count|last_error)' || echo 'Не удалось получить информацию'"

echo ""
log "🎉 Завершено!"


