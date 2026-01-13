#!/bin/bash
# Скрипт для проверки логов checkout страницы на сервере

echo "🔍 Проверка логов checkout страницы..."
echo "=========================================="
echo ""

# Проверяем последние 200 строк логов и фильтруем по checkout
sshpass -p "z67FPwBMJlfWg8LVzG5" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@37.60.228.11 \
  "pm2 logs esimsdata --lines 200 --nostream | grep -E '(checkout|Checkout|CHECKOUT|Plans API request|Sending plans response)' | tail -50"

echo ""
echo "=========================================="
echo "✅ Логи проверены"
echo ""
echo "💡 Для просмотра всех логов в реальном времени используйте:"
echo "   pm2 logs esimsdata"
