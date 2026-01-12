#!/bin/bash
# Прямая установка webhook через API
# Использование: ./scripts/setup-webhook-direct.sh

SERVER_IP="37.60.228.11"
SERVER_USER="root"
SERVER_PASSWORD="z67FPwBMJlfWg8LVzG5"
REMOTE_DIR="/var/www/esimsdata"
WEBHOOK_URL="https://esimsdata.app/api/telegram/bot/webhook"

# Функция для выполнения команд на удаленном сервере
run_remote() {
    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 "$SERVER_USER@$SERVER_IP" "$@"
}

echo "🔍 Получение TELEGRAM_BOT_TOKEN с сервера..."

# Получаем токен бота из .env на сервере
BOT_TOKEN=$(run_remote "cd $REMOTE_DIR && grep '^TELEGRAM_BOT_TOKEN=' .env 2>/dev/null | cut -d '=' -f2 | tr -d '\"' | tr -d \"'\" | head -1")

if [ -z "$BOT_TOKEN" ]; then
    echo "❌ TELEGRAM_BOT_TOKEN не найден на сервере"
    exit 1
fi

echo "✅ Токен получен: ${BOT_TOKEN:0:10}..."

# Получаем секрет webhook (если есть)
WEBHOOK_SECRET=$(run_remote "cd $REMOTE_DIR && grep '^TELEGRAM_WEBHOOK_SECRET=' .env 2>/dev/null | cut -d '=' -f2 | tr -d '\"' | tr -d \"'\" | head -1")

echo ""
echo "🔧 Установка webhook..."

# Формируем payload для setWebhook
PAYLOAD=$(cat <<EOF
{
  "url": "$WEBHOOK_URL",
  "allowed_updates": ["message", "callback_query"]
}
EOF
)

# Если есть секрет, добавляем его
if [ -n "$WEBHOOK_SECRET" ]; then
    PAYLOAD=$(echo "$PAYLOAD" | jq ". + {\"secret_token\": \"$WEBHOOK_SECRET\"}")
    echo "   Используется секрет: ${WEBHOOK_SECRET:0:10}..."
fi

# Устанавливаем webhook
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

# Проверяем результат
if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Webhook успешно установлен!"
    echo "   URL: $WEBHOOK_URL"
    
    # Получаем информацию о webhook
    echo ""
    echo "📋 Информация о webhook:"
    curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq -r '
        if .ok then
            "   URL: " + (.result.url // "не установлен"),
            "   Ожидает обновлений: " + (.result.pending_update_count | tostring),
            (if .result.last_error_date then
                "   ⚠️ Последняя ошибка: " + (.result.last_error_message // "неизвестно"),
                "   Дата ошибки: " + (.result.last_error_date | todateiso8601)
            else
                "   ✅ Нет ошибок"
            end)
        else
            "   ❌ Ошибка: " + .description
        end
    '
else
    echo "❌ Ошибка установки webhook:"
    echo "$RESPONSE" | jq -r '.description // .'
    exit 1
fi

echo ""
echo "🎉 Готово!"




