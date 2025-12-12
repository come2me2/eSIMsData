#!/bin/bash

# Скрипт для обновления кэша Local планов через API endpoint на сервере
# Использование: ./scripts/refresh-local-plans-remote.sh [API_URL] [SECRET]
# Пример: ./scripts/refresh-local-plans-remote.sh https://esim-data.vercel.app

API_URL="${1:-https://esim-data.vercel.app}"
SECRET="${2:-}"

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Обновление кэша Local планов через API...${NC}"
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
skipped=0
errors=()

for country_info in "${countries[@]}"; do
    IFS=':' read -r code name <<< "$country_info"
    
    echo -e "${BLUE}🔄 Обновление кэша для $name ($code)...${NC}"
    
    # Вызываем API endpoint для обновления кэша
    # Просто запрос к /api/esimgo/plans обновит кэш автоматически
    url="$API_URL/api/esimgo/plans?country=$code&category=local"
    
    response=$(curl -s -w "\n%{http_code}" "$url")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        # Проверяем успешность ответа
        if echo "$body" | grep -q '"success":true'; then
            # Извлекаем количество тарифов
            if command -v jq &> /dev/null; then
                standard_count=$(echo "$body" | jq '.data.standard | length' 2>/dev/null || echo "0")
                unlimited_count=$(echo "$body" | jq '.data.unlimited | length' 2>/dev/null || echo "0")
            else
                # Простая проверка без jq
                standard_count=$(echo "$body" | grep -o '"standard":\[' | wc -l || echo "0")
                unlimited_count=$(echo "$body" | grep -o '"unlimited":\[' | wc -l || echo "0")
            fi
            
            if [ "$standard_count" -gt 0 ] || [ "$unlimited_count" -gt 0 ]; then
                echo -e "${GREEN}✅ $name ($code): $standard_count standard, $unlimited_count unlimited${NC}"
                ((success++))
            else
                echo -e "${YELLOW}⚠️ $name ($code): тарифы не найдены${NC}"
                ((skipped++))
            fi
        else
            error_msg=$(echo "$body" | grep -o '"error":"[^"]*"' | head -1 || echo "Unknown error")
            echo -e "${RED}❌ Ошибка для $name ($code): $error_msg${NC}"
            ((failed++))
            errors+=("$name ($code): $error_msg")
        fi
    else
        echo -e "${RED}❌ Ошибка для $name ($code): HTTP $http_code${NC}"
        if [ "$http_code" -eq 401 ]; then
            echo -e "${YELLOW}   Возможно, требуется авторизация${NC}"
        fi
        ((failed++))
        errors+=("$name ($code): HTTP $http_code")
    fi
    
    # Небольшая задержка между запросами
    sleep 0.5
done

echo ""
echo -e "${BLUE}✅ Обновление кэша завершено!${NC}"
echo -e "${BLUE}📊 Результаты:${NC}"
echo -e "   ${GREEN}✅ Успешно: $success${NC}"
echo -e "   ${YELLOW}⚠️ Пропущено (нет тарифов): $skipped${NC}"
echo -e "   ${RED}❌ Ошибки: $failed${NC}"

if [ ${#errors[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ Ошибки:${NC}"
    for error in "${errors[@]}"; do
        echo -e "   ${RED}- $error${NC}"
    done
fi

if [ $failed -gt 0 ]; then
    exit 1
fi

