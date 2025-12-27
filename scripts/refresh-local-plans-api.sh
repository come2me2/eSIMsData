#!/bin/bash

# Скрипт для обновления кэша Local планов через API endpoint
# Использование: ./scripts/refresh-local-plans-api.sh [API_URL]
# Пример: ./scripts/refresh-local-plans-api.sh http://localhost:3000

API_URL="${1:-http://localhost:3000}"

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Обновление кэша Local планов через API..."
echo "📍 API URL: $API_URL"
echo ""

# Страны для обновления
countries=(
    "BO:Bolivia"
    "VG:British Virgin Islands"
    "CW:Curaçao"
    "ET:Ethiopia"
    "GG:Guernsey"
)

success=0
failed=0
skipped=0

for country_info in "${countries[@]}"; do
    IFS=':' read -r code name <<< "$country_info"
    
    echo "🔄 Обновление кэша для $name ($code)..."
    
    response=$(curl -s -w "\n%{http_code}" "$API_URL/api/esimgo/plans?country=$code&category=local")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        # Проверяем, есть ли тарифы в ответе
        standard_count=$(echo "$body" | grep -o '"standard":\[' | wc -l || echo "0")
        unlimited_count=$(echo "$body" | grep -o '"unlimited":\[' | wc -l || echo "0")
        
        # Пытаемся извлечь количество из JSON (более точный способ)
        if command -v jq &> /dev/null; then
            standard_count=$(echo "$body" | jq '.data.standard | length' 2>/dev/null || echo "0")
            unlimited_count=$(echo "$body" | jq '.data.unlimited | length' 2>/dev/null || echo "0")
        fi
        
        if [ "$standard_count" -gt 0 ] || [ "$unlimited_count" -gt 0 ]; then
            echo -e "${GREEN}✅ $name ($code): $standard_count standard, $unlimited_count unlimited${NC}"
            ((success++))
        else
            echo -e "${YELLOW}⚠️ $name ($code): тарифы не найдены${NC}"
            ((skipped++))
        fi
    else
        echo -e "${RED}❌ Ошибка для $name ($code): HTTP $http_code${NC}"
        echo "   Ответ: $body"
        ((failed++))
    fi
    
    # Небольшая задержка между запросами
    sleep 0.5
done

echo ""
echo "✅ Обновление кэша завершено!"
echo "📊 Результаты:"
echo "   ✅ Успешно: $success"
echo "   ⚠️ Пропущено (нет тарифов): $skipped"
echo "   ❌ Ошибки: $failed"

if [ $failed -gt 0 ]; then
    exit 1
fi



