#!/bin/bash

# Скрипт для очистки кэша конкретных стран и перезагрузки данных
# Использование: ./scripts/clear-country-cache.sh [API_URL]
# Пример: ./scripts/clear-country-cache.sh https://esim-data.vercel.app

API_URL="${1:-https://esim-data.vercel.app}"

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Очистка кэша и перезагрузка данных для указанных стран...${NC}"
echo -e "${BLUE}📍 API URL: $API_URL${NC}"
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

for country_info in "${countries[@]}"; do
    IFS=':' read -r code name <<< "$country_info"
    
    echo -e "${BLUE}🔄 Обработка $name ($code)...${NC}"
    
    # Шаг 1: Очищаем кэш через refresh endpoint (если доступен)
    # Шаг 2: Запрашиваем данные заново (это обновит кэш)
    
    # Просто запрашиваем данные с параметром, который заставит обновить кэш
    # Добавляем timestamp для обхода кэша браузера
    url="$API_URL/api/esimgo/plans?country=$code&category=local&_t=$(date +%s)"
    
    echo "   📥 Загрузка данных из API..."
    response=$(curl -s -w "\n%{http_code}" "$url")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        if echo "$body" | grep -q '"success":true'; then
            if command -v jq &> /dev/null; then
                standard_count=$(echo "$body" | jq '.data.standard | length' 2>/dev/null || echo "0")
                unlimited_count=$(echo "$body" | jq '.data.unlimited | length' 2>/dev/null || echo "0")
                source=$(echo "$body" | jq -r '.meta.source // "unknown"' 2>/dev/null)
            else
                standard_count=$(echo "$body" | grep -o '"standard":\[' | wc -l || echo "0")
                unlimited_count=$(echo "$body" | grep -o '"unlimited":\[' | wc -l || echo "0")
                source="unknown"
            fi
            
            if [ "$standard_count" -gt 0 ] || [ "$unlimited_count" -gt 0 ]; then
                echo -e "   ${GREEN}✅ $name ($code): $standard_count standard, $unlimited_count unlimited (source: $source)${NC}"
                ((success++))
            else
                echo -e "   ${YELLOW}⚠️ $name ($code): тарифы не найдены${NC}"
                ((failed++))
            fi
        else
            error_msg=$(echo "$body" | grep -o '"error":"[^"]*"' | head -1 | sed 's/"error":"\([^"]*\)"/\1/' || echo "Unknown error")
            echo -e "   ${RED}❌ Ошибка: $error_msg${NC}"
            ((failed++))
        fi
    else
        echo -e "   ${RED}❌ HTTP $http_code${NC}"
        ((failed++))
    fi
    
    # Небольшая задержка между запросами
    sleep 0.5
done

echo ""
echo -e "${BLUE}✅ Обработка завершена!${NC}"
echo -e "${BLUE}📊 Результаты:${NC}"
echo -e "   ${GREEN}✅ Успешно: $success${NC}"
echo -e "   ${RED}❌ Ошибки: $failed${NC}"

if [ $failed -gt 0 ]; then
    exit 1
fi

